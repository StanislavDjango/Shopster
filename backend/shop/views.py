from __future__ import annotations

import logging
from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.db import IntegrityError
from django.db.models import Avg, Count, Max, Min, Q
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.timezone import make_aware
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import ProductFilter
from .models import Cart, CartItem, Category, Order, OrderItem, Product, ProductReview
from .permissions import IsAdminOrReadOnly, IsReviewAuthorOrStaff
from .serializers import (
    CartItemSerializer,
    CartSerializer,
    CategorySerializer,
    OrderCreateSerializer,
    OrderSerializer,
    ProductReviewSerializer,
    ProductSerializer,
)
from .utils import user_has_verified_purchase

logger = logging.getLogger(__name__)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = "slug"


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = "slug"
    filterset_class = ProductFilter
    ordering_fields = (
        "price",
        "created_at",
        "name",
        "reviews_count",
        "average_rating",
    )
    ordering = ("name",)

    def get_queryset(self):
        return (
            Product.objects.select_related("category")
            .prefetch_related("images")
            .annotate(
                reviews_count=Count(
                    "reviews",
                    filter=Q(
                        reviews__moderation_status=ProductReview.ModerationStatus.APPROVED,
                        reviews__deleted_at__isnull=True,
                    ),
                    distinct=True,
                ),
                average_rating=Avg(
                    "reviews__rating",
                    filter=Q(
                        reviews__moderation_status=ProductReview.ModerationStatus.APPROVED,
                        reviews__deleted_at__isnull=True,
                    ),
                ),
            )
        )

    @action(detail=False, permission_classes=[AllowAny])
    def facets(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        brand_rows = (
            queryset.exclude(brand__isnull=True)
            .exclude(brand__exact="")
            .values("brand")
            .annotate(count=Count("id"))
            .order_by("-count", "brand")
        )
        price_bounds = queryset.aggregate(min_price=Min("price"), max_price=Max("price"))
        return Response(
            {
                "brands": [
                    {"name": row["brand"], "count": row["count"]}
                    for row in brand_rows
                    if row["brand"]
                ],
                "price": {
                    "min": price_bounds.get("min_price"),
                    "max": price_bounds.get("max_price"),
                },
            }
        )


class CartViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Cart.objects.prefetch_related(
        "items__product__category", "items__product__images"
    )
    serializer_class = CartSerializer
    permission_classes = [AllowAny]
    lookup_field = "id"

    def create(self, request, *args, **kwargs):
        cart = Cart.objects.create(
            user=request.user if request.user.is_authenticated else None,
        )
        serializer = self.get_serializer(cart)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class CartItemViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = CartItemSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        cart_id = self.kwargs["cart_id"]
        return (
            CartItem.objects.filter(cart_id=cart_id)
            .select_related("product", "cart", "product__category")
            .prefetch_related("product__images")
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["cart_id"] = self.kwargs["cart_id"]
        return context

    def perform_create(self, serializer):
        cart = get_object_or_404(Cart, pk=self.kwargs["cart_id"])
        serializer.save(cart=cart)

    def perform_update(self, serializer):
        serializer.save()


class ProductReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ProductReviewSerializer
    lookup_field = "id"
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        if self.action in {"update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsReviewAuthorOrStaff()]
        if self.action == "moderate":
            return [IsAdminUser()]
        return [AllowAny()]

    def get_queryset(self):
        qs = ProductReview.all_objects.filter(deleted_at__isnull=True).select_related(
            "product", "user"
        )
        request = self.request
        product_id = request.query_params.get("product")
        product_slug = request.query_params.get("product_slug")
        if product_id:
            qs = qs.filter(product_id=product_id)
        if product_slug:
            qs = qs.filter(product__slug=product_slug)

        if request.user.is_staff:
            moderation = request.query_params.get("moderation")
            if moderation in ProductReview.ModerationStatus.values:
                qs = qs.filter(moderation_status=moderation)
            return qs.order_by("-created_at")

        visibility = Q(moderation_status=ProductReview.ModerationStatus.APPROVED)
        if request.user.is_authenticated:
            visibility |= Q(user=request.user)
        return qs.filter(visibility).order_by("-created_at")

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]
        user = self.request.user if self.request.user.is_authenticated else None
        raw_author_name = serializer.validated_data.get("author_name", "") or ""
        author_name = raw_author_name.strip()
        if user:
            default_name = user.get_full_name().strip() or user.get_username()
            if not author_name:
                author_name = default_name
        if not author_name:
            author_name = "\u0413\u043e\u0441\u0442\u044c"
        try:
            serializer.save(
                user=user,
                author_name=author_name,
                verified_purchase=(
                    user_has_verified_purchase(user, product) if user else False
                ),
                moderation_status=ProductReview.ModerationStatus.PENDING,
            )
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        "You have already submitted a review for this product."
                    ]
                }
            ) from exc

    def perform_update(self, serializer):
        review = serializer.save()
        if not review.verified_purchase:
            review.verified_purchase = user_has_verified_purchase(
                review.user, review.product
            )
        review.moderation_status = ProductReview.ModerationStatus.PENDING
        review.moderated_by = None
        review.moderated_at = None
        review.moderation_note = ""
        review.save(
            update_fields=[
                "verified_purchase",
                "moderation_status",
                "moderated_by",
                "moderated_at",
                "moderation_note",
                "updated_at",
            ]
        )

    def perform_destroy(self, instance):
        instance.delete()

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def moderate(self, request, *args, **kwargs):
        review = self.get_object()
        status_value = request.data.get("status")
        note = request.data.get("note", "")
        if status_value not in ProductReview.ModerationStatus.values:
            raise serializers.ValidationError({"status": "Invalid moderation status."})
        review.mark_moderated(status=status_value, moderator=request.user, note=note)
        serializer = self.get_serializer(review)
        return Response(serializer.data)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        queryset = Order.objects.select_related("user").prefetch_related(
            "items__product", "items__product__images"
        )
        user = self.request.user
        if user.is_authenticated:
            if user.is_staff:
                return queryset
            return queryset.filter(user=user)
        return Order.objects.none()

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        return OrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        output_serializer = OrderSerializer(
            order, context=self.get_serializer_context()
        )
        auto_registered_user = getattr(serializer, "auto_registered_user", None)
        if auto_registered_user:
            self._send_account_setup_email(auto_registered_user)
        response_payload = dict(output_serializer.data)
        response_payload["requires_account_activation"] = bool(auto_registered_user)
        if auto_registered_user and auto_registered_user.email:
            response_payload["activation_email"] = auto_registered_user.email
        self._send_confirmation_email(order)
        headers = self.get_success_headers(output_serializer.data)
        return Response(
            response_payload, status=status.HTTP_201_CREATED, headers=headers
        )

    def _send_confirmation_email(self, order: Order) -> None:
        if not order.customer_email:
            return
        try:
            items = order.items.select_related("product").all()
            lines = [
                f"- {item.product_name} x {item.quantity} - {item.line_total} {order.currency}"
                for item in items
            ]
            items_block = "\n".join(lines) if lines else "Cart is empty."
            message = (
                f"Hello, {order.shipping_full_name}!\n\n"
                f"Thank you for your order #{order.pk}.\n\n"
                f"Order summary:\n{items_block}\n\n"
                f"Subtotal: {order.subtotal_amount} {order.currency}\n"
                f"Shipping: {order.shipping_amount} {order.currency}\n"
                f"Total: {order.total_amount} {order.currency}\n\n"
                "We will contact you shortly to confirm the details.\n"
                "If you did not place this order, please ignore this email."
            )
            send_mail(
                subject=f"Order confirmation #{order.pk}",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[order.customer_email],
                fail_silently=True,
            )
        except Exception as exc:  # pragma: no cover
            logger.warning("Failed to send order confirmation email: %s", exc)

    def _send_account_setup_email(self, user) -> None:
        if not getattr(user, "email", None):
            return
        try:
            token_generator = PasswordResetTokenGenerator()
            token = token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = (
                f"{settings.FRONTEND_PASSWORD_RESET_URL}?uid={uid}&token={token}"
            )
            full_name = user.get_full_name() or user.get_username()
            message = (
                f"Р—РґСЂР°РІСЃС‚РІСѓР№С‚Рµ, {full_name}!\n\n"
                "Р”Р»СЏ СѓРґРѕР±СЃС‚РІР° РјС‹ СЃРѕР·РґР°Р»Рё РґР»СЏ РІР°СЃ Р°РєРєР°СѓРЅС‚ РІ Shopster, С‡С‚РѕР±С‹ РІС‹ РјРѕРіР»Рё РѕС‚СЃР»РµР¶РёРІР°С‚СЊ СЃРІРѕРё Р·Р°РєР°Р·С‹.\n"
                f"РџРµСЂРµР№РґРёС‚Рµ РїРѕ СЃСЃС‹Р»РєРµ, С‡С‚РѕР±С‹ РїСЂРёРґСѓРјР°С‚СЊ РїР°СЂРѕР»СЊ Рё Р·Р°РІРµСЂС€РёС‚СЊ СЂРµРіРёСЃС‚СЂР°С†РёСЋ:\n{reset_url}\n\n"
                "Р•СЃР»Рё РІС‹ РЅРµ РѕС„РѕСЂРјР»СЏР»Рё Р·Р°РєР°Р· РёР»Рё РЅРµ С…РѕС‚РёС‚Рµ СЃРѕР·РґР°РІР°С‚СЊ Р°РєРєР°СѓРЅС‚, РїСЂРѕСЃС‚Рѕ РїСЂРѕРёРіРЅРѕСЂРёСЂСѓР№С‚Рµ СЌС‚Рѕ РїРёСЃСЊРјРѕ."
            )
            send_mail(
                subject="Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ РІ Shopster",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception as exc:  # pragma: no cover
            logger.warning("Failed to send auto-registration email: %s", exc)


class StatisticsOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        order_queryset = Order.objects.all()
        if date_from:
            try:
                start = datetime.fromisoformat(date_from)
                if start.tzinfo is None:
                    start = make_aware(start)
                order_queryset = order_queryset.filter(placed_at__gte=start)
            except ValueError:
                return Response(
                    {"detail": "Invalid date_from format. Use ISO 8601."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if date_to:
            try:
                end = datetime.fromisoformat(date_to)
                if end.tzinfo is None:
                    end = make_aware(end)
                order_queryset = order_queryset.filter(placed_at__lte=end)
            except ValueError:
                return Response(
                    {"detail": "Invalid date_to format. Use ISO 8601."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        totals_by_currency_raw = order_queryset.values("currency").annotate(
            total_sales=Sum("total_amount"),
            total_orders=Count("id"),
        )
        totals_by_currency = [
            {
                "currency": item["currency"],
                "total_sales": str(item["total_sales"] or Decimal("0.00")),
                "total_orders": item["total_orders"],
            }
            for item in totals_by_currency_raw
        ]
        total_orders = sum(item["total_orders"] for item in totals_by_currency)
        gross_revenue = sum(Decimal(item["total_sales"]) for item in totals_by_currency)

        top_products_queryset = (
            OrderItem.objects.filter(order__in=order_queryset)
            .values("product_id", "product_name")
            .annotate(
                total_quantity=Sum("quantity"),
                total_sales=Sum("line_total"),
            )
            .order_by("-total_quantity")[:5]
        )
        top_products = [
            {
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "total_quantity": item["total_quantity"],
                "total_sales": str(item["total_sales"] or Decimal("0.00")),
            }
            for item in top_products_queryset
        ]

        response_payload = {
            "total_orders": total_orders,
            "gross_revenue": str(gross_revenue),
            "currency_breakdown": totals_by_currency,
            "top_products": top_products,
        }
        return Response(response_payload)
