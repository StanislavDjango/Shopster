"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { useSession } from "next-auth/react";

import type { ProductReview } from "@/types/product";
import {
  createProductReview,
  deleteProductReview,
  fetchProductReviews,
  updateProductReview,
} from "@/lib/reviewApi";

type ProductReviewsProps = {
  productId: number;
  productSlug: string;
  averageRating: number | null;
  reviewsCount: number;
  canReview: boolean;
  userReview: ProductReview | null;
};

type ReviewFormState = {
  rating: number;
  title: string;
  body: string;
  authorName: string;
};

const initialFormState: ReviewFormState = {
  rating: 5,
  title: "",
  body: "",
  authorName: "",
};

// ?????? ????????? ???????? (1..5)
function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const current = hover ?? value;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(5, value + 1));
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(1, value - 1));
    }
    if (e.key === "Home") {
      e.preventDefault();
      onChange(1);
    }
    if (e.key === "End") {
      e.preventDefault();
      onChange(5);
    }
  };

  return (
    <div
      className="rating-stars"
      role="slider"
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={value}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`rating-star ${current >= n ? "is-filled" : ""}`}
          aria-label={`${n} ?? 5`}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          ?
        </button>
      ))}
      <span className="rating-value">{current} / 5</span>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function moderationLabel(status: ProductReview["moderation_status"]): string {
  switch (status) {
    case "approved":
      return "Одобрен";
    case "pending":
      return "На модерации";
    case "rejected":
      return "Отклонён";
    default:
      return status;
  }
}

export function ProductReviews({
  productId,
  productSlug,
  averageRating,
  reviewsCount,
  canReview,
  userReview,
}: ProductReviewsProps) {
  const { status: sessionStatus, data: session } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStatus === "authenticated",
  );
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [totalCount, setTotalCount] = useState<number>(reviewsCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [editingReview, setEditingReview] = useState<ProductReview | null>(
    null,
  );
  const [form, setForm] = useState<ReviewFormState>(() => {
    if (userReview) {
      return {
        rating: userReview.rating,
        title: userReview.title ?? "",
        body: userReview.body ?? "",
        authorName: userReview.user?.name ?? "",
      };
    }
    return { ...initialFormState };
  });

  useEffect(() => {
    setIsAuthenticated(sessionStatus === "authenticated");
  }, [sessionStatus]);

  const hasMore = nextPage !== null;

  const loadReviews = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const {
          reviews: fetched,
          nextPage: next,
          totalCount: count,
        } = await fetchProductReviews(productSlug, page);
        setReviews((prev) => {
          if (page === 1) {
            return fetched;
          }
          const existingIds = new Set(prev.map((review) => review.id));
          const merged = [...prev];
          fetched.forEach((review) => {
            if (!existingIds.has(review.id)) {
              merged.push(review);
            }
          });
          return merged;
        });
        setNextPage(next);
        setTotalCount(count);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Не удалось загрузить отзывы.",
        );
      } finally {
        setLoading(false);
      }
    },
    [productSlug],
  );

  useEffect(() => {
    loadReviews(1).catch(() => undefined);
  }, [loadReviews]);

  const canSubmitReview = useMemo(() => canReview, [canReview]);

  const resetForm = () => {
    setFormVisible(false);
    setEditingReview(null);
    setForm({ ...initialFormState });
  };

  const handleCreateOrUpdate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const accessToken = (session as any)?.accessToken as string | undefined;
      if (editingReview) {
        const updated = await updateProductReview(
          editingReview.id,
          {
            rating: form.rating,
            title: form.title,
            body: form.body,
          },
          accessToken,
        );
        setReviews((prev) =>
          prev.map((review) => (review.id === updated.id ? updated : review)),
        );
        resetForm();
      } else {
        const payload: Parameters<typeof createProductReview>[0] = {
          product_id: productId,
          rating: form.rating,
          title: form.title,
          body: form.body,
        };
        if (!isAuthenticated) {
          const trimmedName = form.authorName.trim();
          if (trimmedName) {
            payload.author_name = trimmedName;
          }
        }
        const created = await createProductReview(payload, accessToken);
        setReviews((prev) => [
          created,
          ...prev.filter((review) => review.id !== created.id),
        ]);
        setTotalCount((prev) => prev + 1);
        setNextPage(nextPage ?? null);
        setFormVisible(false);
        setEditingReview(null);
        setForm({ ...initialFormState });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить отзыв.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (review: ProductReview) => {
    setEditingReview(review);
    setForm({
      rating: review.rating,
      title: review.title ?? "",
      body: review.body ?? "",
      authorName: review.user?.name ?? "",
    });
    setFormVisible(true);
  };

  const handleDelete = async (reviewId: number) => {
    if (!confirm("Удалить отзыв?")) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const accessToken = (session as any)?.accessToken as string | undefined;
      await deleteProductReview(reviewId, accessToken);
      setReviews((prev) => prev.filter((review) => review.id !== reviewId));
      setFormVisible(false);
      setEditingReview(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось удалить отзыв.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadMore = () => {
    if (nextPage && !loading) {
      loadReviews(nextPage).catch(() => undefined);
    }
  };

  const derivedAverage = averageRating ?? null;
  const approvedCount = reviewsCount;

  return (
    <section className="product-reviews">
      <header className="product-reviews__header">
        <h2>Отзывы</h2>
        <p className="product-reviews__summary">
          {approvedCount > 0
            ? `Средняя оценка ${derivedAverage?.toFixed(1) ?? "—"} ★ · Одобренных отзывов: ${approvedCount}`
            : "Пока нет одобренных отзывов"}
        </p>
      </header>

      {error && <p className="product-reviews__error">{error}</p>}

      {canSubmitReview && !formVisible && (
        <button
          className="btn btn-primary"
          onClick={() => setFormVisible(true)}
        >
          Написать отзыв
        </button>
      )}

      {!isAuthenticated && (
        <p className="product-reviews__hint">
          {
            "\u0412\u044b \u043c\u043e\u0436\u0435\u0442\u0435 \u043e\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0437\u044b\u0432 \u0431\u0435\u0437 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438."
          }{" "}
          <Link href="/api/auth/signin" className="link">
            {"\u0412\u043e\u0439\u0434\u0438\u0442\u0435"}
          </Link>{" "}
          {
            "\u0435\u0441\u043b\u0438 \u0445\u043e\u0442\u0438\u0442\u0435 \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u0442\u044c \u043e\u0442\u0437\u044b\u0432 \u043a \u0441\u0432\u043e\u0435\u043c\u0443 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0443."
          }
        </p>
      )}

      {formVisible && (
        <div className="product-reviews__form">
          <h3>{editingReview ? "Изменить отзыв" : "Новый отзыв"}</h3>
          <div className="form-grid">
            <label>
              <span>Оценка</span>

              <StarRating
                value={form.rating}
                disabled={submitting}
                onChange={(next) =>
                  setForm((prev) => ({ ...prev, rating: next }))
                }
              />
            </label>
            {!isAuthenticated && (
              <label>
                <span>{"\u0412\u0430\u0448\u0435 \u0438\u043c\u044f"}</span>
                <input
                  type="text"
                  value={form.authorName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      authorName: event.target.value,
                    }))
                  }
                  placeholder="\u041f\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u044c\u0442\u0435\u0441\u044c, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0438\u043c\u044f \u0440\u044f\u0434\u043e\u043c \u0441 \u043e\u0442\u0437\u044b\u0432\u043e\u043c"
                  disabled={submitting}
                  maxLength={120}
                />
              </label>
            )}

            <label>
              <span>Заголовок</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Коротко о впечатлении"
                disabled={submitting}
                maxLength={120}
              />
            </label>
            <label className="form-grid__full">
              <span>Отзыв</span>
              <textarea
                value={form.body}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, body: event.target.value }))
                }
                rows={4}
                placeholder="Поделитесь опытом покупки и использования"
                disabled={submitting}
              />
            </label>
          </div>
          <div className="product-reviews__form-actions">
            <button
              className="btn btn-primary"
              onClick={handleCreateOrUpdate}
              disabled={submitting || !form.body.trim()}
            >
              {submitting ? "Сохраняем..." : "Отправить"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={resetForm}
              disabled={submitting}
            >
              Отмена
            </button>
          </div>
          <p className="product-reviews__note">
            Отправленный отзыв попадёт на модерацию. О публикации мы сообщим
            письмом.
          </p>
        </div>
      )}

      <ul className="product-review-list">
        {reviews.map((review) => (
          <li key={review.id} className="product-review-card">
            <div className="product-review-card__header">
              <strong>
                {review.user?.name ?? "\u0413\u043e\u0441\u0442\u044c"}
              </strong>
              <span className="product-review-card__rating">{`${review.rating} ★`}</span>
            </div>
            <div className="product-review-card__meta">
              <span>{formatDate(review.created_at)}</span>
              {review.verified_purchase && (
                <span className="tag">Проверенная покупка</span>
              )}
              <span className={`tag tag--${review.moderation_status}`}>
                {moderationLabel(review.moderation_status)}
              </span>
            </div>
            {review.title && (
              <h4 className="product-review-card__title">{review.title}</h4>
            )}
            <p className="product-review-card__body">{review.body}</p>
            {review.is_owner && (
              <div className="product-review-card__actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => handleEdit(review)}
                  disabled={submitting}
                >
                  Редактировать
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => handleDelete(review.id)}
                  disabled={submitting}
                >
                  Удалить
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          className="btn btn-secondary"
          onClick={handleLoadMore}
          disabled={loading}
        >
          {loading ? "Загружаем..." : "Показать ещё"}
        </button>
      )}

      {!loading && reviews.length === 0 && (
        <p className="product-reviews__empty">
          Будьте первым, кто поделится впечатлением о товаре.
        </p>
      )}
    </section>
  );
}
