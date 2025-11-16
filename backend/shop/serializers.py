from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils.text import slugify
from rest_framework import serializers

from .models import (
    Cart,
    CartItem,
    Category,
    Order,
    OrderItem,
    Product,
    ProductImage,
    ProductReview,
)

User = get_user_model()


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "alt_text", "is_main")
        read_only_fields = ("id",)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "meta_title",
            "meta_description",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "created_at", "updated_at")


class ProductReviewSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    product_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=Product.objects.filter(is_active=True),
        write_only=True,
    )
    author_name = serializers.CharField(
        write_only=True, required=False, allow_blank=True, max_length=255
    )
    user = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = (
            "id",
            "product",
            "product_id",
            "rating",
            "title",
            "body",
            "author_name",
            "verified_purchase",
            "moderation_status",
            "moderation_note",
            "created_at",
            "updated_at",
            "user",
            "is_owner",
        )
        read_only_fields = (
            "id",
            "product",
            "verified_purchase",
            "moderation_status",
            "moderated_at",
            "moderation_note",
            "created_at",
            "updated_at",
            "user",
            "is_owner",
        )

    def get_product(self, obj: ProductReview) -> dict[str, str | int]:
        return {
            "id": obj.product_id,
            "slug": obj.product.slug,
            "name": obj.product.name,
        }

    def get_user(self, obj: ProductReview) -> dict[str, str | int | None]:
        if obj.user_id and obj.user:
            name = obj.user.get_full_name().strip() or obj.user.get_username()
            return {
                "id": obj.user_id,
                "name": name,
            }
        display_name = (
            obj.author_name or ""
        ).strip() or "\u0413\u043e\u0441\u0442\u044c"
        return {
            "id": None,
            "name": display_name,
        }

    def get_is_owner(self, obj: ProductReview) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.user_id == request.user.id

    def validate_rating(self, value: int) -> int:
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def to_representation(self, instance: ProductReview):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if not request or not request.user.is_staff:
            data.pop("moderation_note", None)
        return data


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=Category.objects.filter(is_active=True),
        write_only=True,
    )
    images = ProductImageSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.IntegerField(read_only=True)
    can_review = serializers.SerializerMethodField()
    user_review = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "category",
            "category_id",
            "brand",
            "name",
            "slug",
            "sku",
            "short_description",
            "description",
            "meta_title",
            "meta_description",
            "meta_keywords",
            "price",
            "currency",
            "stock",
            "is_active",
            "images",
            "average_rating",
            "reviews_count",
            "can_review",
            "user_review",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "brand",
            "average_rating",
            "reviews_count",
            "can_review",
            "user_review",
            "created_at",
            "updated_at",
        )

    def get_average_rating(self, obj: Product):
        value = getattr(obj, "average_rating", None)
        if value is None:
            return None
        return round(float(value), 2)

    def get_can_review(self, obj: Product) -> bool:
        request = self.context.get("request")
        if not request:
            return False
        user = request.user if request.user.is_authenticated else None
        if (
            user
            and ProductReview.objects.with_unapproved()
            .filter(
                product=obj,
                user=user,
                deleted_at__isnull=True,
            )
            .exists()
        ):
            return False
        return True

    def get_user_review(self, obj: Product):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        review = (
            ProductReview.objects.with_unapproved()
            .filter(
                product=obj,
                user=request.user,
                deleted_at__isnull=True,
            )
            .first()
        )
        if not review:
            return None
        return ProductReviewSerializer(review, context=self.context).data


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=Product.objects.filter(is_active=True),
        write_only=True,
    )
    subtotal = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = CartItem
        fields = ("id", "product", "product_id", "quantity", "subtotal", "cart")
        read_only_fields = ("id", "product", "subtotal", "cart")


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "items", "subtotal", "total_items", "created_at", "updated_at")
        read_only_fields = fields

    def get_total_items(self, obj: Cart) -> int:
        return sum(item.quantity for item in obj.items.all())


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product",
            "product_name",
            "unit_price",
            "quantity",
            "line_total",
        )
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "status",
            "payment_status",
            "subtotal_amount",
            "shipping_amount",
            "total_amount",
            "currency",
            "customer_email",
            "customer_phone",
            "shipping_full_name",
            "shipping_address",
            "shipping_city",
            "shipping_postcode",
            "shipping_country",
            "notes",
            "placed_at",
            "items",
        )
        read_only_fields = (
            "id",
            "status",
            "payment_status",
            "subtotal_amount",
            "total_amount",
            "placed_at",
            "items",
        )


class OrderCreateSerializer(serializers.ModelSerializer):
    cart_id = serializers.UUIDField(write_only=True)
    shipping_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:
        model = Order
        fields = (
            "cart_id",
            "customer_email",
            "customer_phone",
            "shipping_full_name",
            "shipping_address",
            "shipping_city",
            "shipping_postcode",
            "shipping_country",
            "notes",
            "shipping_amount",
        )

    def validate_cart_id(self, value):
        if not Cart.objects.filter(id=value).exists():
            raise serializers.ValidationError("Cart not found.")
        return value

    def create(self, validated_data):
        cart_id = validated_data.pop("cart_id")
        shipping_amount = validated_data.pop("shipping_amount", Decimal("0.00"))
        cart = Cart.objects.get(id=cart_id)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        self.auto_registered_user = None
        resolved_user, is_auto_registered = self._resolve_user(
            user,
            email=validated_data.get("customer_email"),
            full_name=validated_data.get("shipping_full_name", ""),
        )
        try:
            order = Order.create_from_cart(
                cart,
                user=resolved_user,
                shipping_amount=shipping_amount,
                **validated_data,
            )
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        self.auto_registered_user = resolved_user if is_auto_registered else None
        return order

    def _resolve_user(
        self, request_user, *, email: str | None, full_name: str
    ) -> tuple[object | None, bool]:
        if request_user and request_user.is_authenticated:
            return request_user, False
        if not email:
            return None, False
        UserModel = get_user_model()
        existing_user = UserModel.objects.filter(email__iexact=email).first()
        if existing_user:
            return existing_user, False
        username = self._generate_username(email, UserModel)
        first_name, last_name = self._split_full_name(full_name)
        user = UserModel.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )
        return user, True

    def _generate_username(self, email: str, user_model) -> str:
        base_part = email.split("@")[0] if "@" in email else email
        slug_base = slugify(base_part)
        if not slug_base:
            slug_base = "user"
        max_length = getattr(user_model._meta.get_field("username"), "max_length", 150)
        usable_length = max_length - 6 if max_length and max_length > 6 else max_length
        slug_base = slug_base[:usable_length] if usable_length else slug_base
        if not slug_base:
            slug_base = "user"
        candidate = slug_base
        suffix = 1
        while user_model.objects.filter(username=candidate).exists():
            suffix += 1
            candidate = f"{slug_base}-{suffix}"
            candidate = candidate[:max_length]
        return candidate

    def _split_full_name(self, full_name: str) -> tuple[str, str]:
        parts = full_name.strip().split()
        if not parts:
            return "", ""
        first_name = parts[0]
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
        return first_name, last_name
