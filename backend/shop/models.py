from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.utils.text import slugify


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return super().update(deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        return self.filter(deleted_at__isnull=False)


class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).alive()

    def all_with_deleted(self):
        return SoftDeleteQuerySet(self.model, using=self._db)

    def deleted_only(self):
        return self.all_with_deleted().dead()


class SoftDeleteAllManager(SoftDeleteManager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = SoftDeleteAllManager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        if self.deleted_at:
            return
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        if self.deleted_at:
            self.deleted_at = None
            self.save(update_fields=["deleted_at"])


class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True, allow_unicode=True)
    description = models.TextField(blank=True)
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        verbose_name = "РљР°С‚РµРіРѕСЂРёСЏ"
        verbose_name_plural = "РљР°С‚РµРіРѕСЂРёРё"

    def save(self, *args, **kwargs):
        if not self.slug:
            raw_slug = slugify(self.name, allow_unicode=True)
            self.slug = raw_slug or f"category-{uuid4().hex[:8]}"
        if not self.meta_title:
            self.meta_title = self.name
        if not self.meta_description and self.description:
            self.meta_description = self.description[:500]
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class Product(SoftDeleteModel):
    category = models.ForeignKey(
        Category,
        related_name="products",
        on_delete=models.PROTECT,
    )
    brand = models.CharField(max_length=255, blank=True, default="", db_index=True)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True, allow_unicode=True)
    sku = models.CharField(max_length=64, unique=True)
    short_description = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.CharField(max_length=500, blank=True)
    meta_keywords = models.CharField(max_length=255, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="RUB")
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        verbose_name = "РўРѕРІР°СЂ"
        verbose_name_plural = "РўРѕРІР°СЂС‹"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = (
                slugify(self.name, allow_unicode=True) or f"product-{uuid4().hex[:8]}"
            )
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                counter += 1
                slug = f"{base_slug}-{counter}"
            self.slug = slug
        if not self.meta_title:
            self.meta_title = self.name
        if not self.meta_description:
            candidates = [self.short_description, self.description]
            self.meta_description = next((c[:500] for c in candidates if c), "")
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        related_name="images",
        on_delete=models.CASCADE,
    )
    image = models.ImageField(upload_to="products/")
    alt_text = models.CharField(max_length=255, blank=True)
    is_main = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "РР·РѕР±СЂР°Р¶РµРЅРёРµ С‚РѕРІР°СЂР°"
        verbose_name_plural = "РР·РѕР±СЂР°Р¶РµРЅРёСЏ С‚РѕРІР°СЂР°"

    def __str__(self) -> str:
        return f"{self.product.name} image"


class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="carts",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)
        verbose_name = "РљРѕСЂР·РёРЅР°"
        verbose_name_plural = "РљРѕСЂР·РёРЅС‹"

    def __str__(self) -> str:
        return f"Cart {self.pk}"

    @property
    def subtotal(self) -> Decimal:
        total = Decimal("0.00")
        for item in self.items.select_related("product"):
            total += item.subtotal
        return total


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        related_name="items",
        on_delete=models.CASCADE,
    )
    product = models.ForeignKey(
        Product,
        related_name="cart_items",
        on_delete=models.CASCADE,
    )
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("cart", "product")
        verbose_name = "РџРѕР·РёС†РёСЏ РєРѕСЂР·РёРЅС‹"
        verbose_name_plural = "РџРѕР·РёС†РёРё РєРѕСЂР·РёРЅС‹"

    def __str__(self) -> str:
        return f"{self.quantity} x {self.product.name}"

    @property
    def subtotal(self) -> Decimal:
        return self.product.price * self.quantity


class Order(SoftDeleteModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        PENDING = "pending", "В ожидании"
        PAID = "paid", "Оплачен"
        SHIPPED = "shipped", "Отгружен"
        COMPLETED = "completed", "Завершён"
        CANCELLED = "cancelled", "Отменён"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Ожидает оплаты"
        PAID = "paid", "Оплачен"
        REFUNDED = "refunded", "Возврат"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="orders",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    cart = models.OneToOneField(
        Cart,
        related_name="order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    subtotal_amount = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="RUB")
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=32, blank=True)
    shipping_full_name = models.CharField(max_length=255)
    shipping_address = models.CharField(max_length=500)
    shipping_city = models.CharField(max_length=100)
    shipping_postcode = models.CharField(max_length=20, blank=True)
    shipping_country = models.CharField(max_length=100, default="Russia")
    notes = models.TextField(blank=True)
    placed_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-placed_at",)
        verbose_name = "Р—Р°РєР°Р·"
        verbose_name_plural = "Р—Р°РєР°Р·С‹"

    def __str__(self) -> str:
        return f"Order #{self.pk}"

    @classmethod
    def create_from_cart(
        cls,
        cart: Cart,
        *,
        user=None,
        shipping_amount: Decimal = Decimal("0.00"),
        currency: str = "RUB",
        **fields,
    ) -> "Order":
        with transaction.atomic():
            cart = (
                Cart.objects.select_for_update()
                .prefetch_related("items__product")
                .get(pk=cart.pk)
            )
            if not cart.items.exists():
                raise ValueError(
                    "РќРµРІРѕР·РјРѕР¶РЅРѕ РѕС„РѕСЂРјРёС‚СЊ Р·Р°РєР°Р·: РєРѕСЂР·РёРЅР° РїСѓСЃС‚Р°."
                )

            subtotal = Decimal("0.00")
            order = cls.objects.create(
                cart=cart,
                user=user if user and user.is_authenticated else None,
                subtotal_amount=Decimal("0.00"),
                shipping_amount=shipping_amount,
                total_amount=Decimal("0.00"),
                currency=currency,
                **fields,
            )

            order_items: list[OrderItem] = []
            for item in cart.items.select_related("product"):
                line_total = item.product.price * item.quantity
                subtotal += line_total
                order_items.append(
                    OrderItem(
                        order=order,
                        product=item.product,
                        product_name=item.product.name,
                        unit_price=item.product.price,
                        quantity=item.quantity,
                        line_total=line_total,
                    )
                )

            OrderItem.objects.bulk_create(order_items)

            order.subtotal_amount = subtotal
            order.total_amount = subtotal + shipping_amount
            order.save(update_fields=["subtotal_amount", "total_amount"])
            cart.delete()
            return order


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        related_name="items",
        on_delete=models.CASCADE,
    )
    product = models.ForeignKey(
        Product,
        related_name="order_items",
        on_delete=models.PROTECT,
    )
    product_name = models.CharField(max_length=255)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "РџРѕР·РёС†РёСЏ Р·Р°РєР°Р·Р°"
        verbose_name_plural = "РџРѕР·РёС†РёРё Р·Р°РєР°Р·Р°"

    def __str__(self) -> str:
        return f"{self.product_name} x {self.quantity}"


class ProductReviewQuerySet(SoftDeleteQuerySet):
    def approved(self):
        return self.filter(moderation_status=ProductReview.ModerationStatus.APPROVED)


class ProductReviewManager(SoftDeleteManager):
    def get_queryset(self):
        return ProductReviewQuerySet(self.model, using=self._db).alive().approved()

    def with_unapproved(self):
        return ProductReviewQuerySet(self.model, using=self._db).alive()


class ProductReview(SoftDeleteModel):
    class ModerationStatus(models.TextChoices):
        PENDING = "pending", "На модерации"
        APPROVED = "approved", "Одобрен"
        REJECTED = "rejected", "Отклонён"

    product = models.ForeignKey(
        Product,
        related_name="reviews",
        on_delete=models.CASCADE,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="product_reviews",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    rating = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=255, blank=True)
    body = models.TextField()
    author_name = models.CharField(max_length=255, blank=True)
    verified_purchase = models.BooleanField(default=False)
    moderation_status = models.CharField(
        max_length=20,
        choices=ModerationStatus.choices,
        default=ModerationStatus.PENDING,
    )
    moderation_note = models.TextField(blank=True)
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="moderated_product_reviews",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ProductReviewManager()
    all_objects = ProductReviewQuerySet.as_manager()

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("product", "user"),
                condition=models.Q(deleted_at__isnull=True, user__isnull=False),
                name="unique_active_product_review",
            ),
            models.CheckConstraint(
                check=models.Q(rating__gte=1, rating__lte=5),
                name="product_review_rating_range",
            ),
        ]
        verbose_name = "Отзыв о товаре"
        verbose_name_plural = "Отзывы о товарах"

    def __str__(self) -> str:
        if self.user_id and self.user:
            name = self.user.get_full_name().strip() or self.user.get_username()
        else:
            name = (self.author_name or "").strip() or "Anonymous"
        return f"{self.product} review by {name}"

    def mark_moderated(self, *, status: str, moderator, note: str = "") -> None:
        if status not in self.ModerationStatus.values:
            raise ValueError("Unknown moderation status")
        self.moderation_status = status
        self.moderated_by = moderator
        self.moderation_note = note
        self.moderated_at = timezone.now()
        self.save(
            update_fields=[
                "moderation_status",
                "moderated_by",
                "moderation_note",
                "moderated_at",
                "updated_at",
            ]
        )
