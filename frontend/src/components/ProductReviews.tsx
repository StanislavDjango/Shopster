"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useSession } from "next-auth/react";

import type { ProductReview } from "@/types/product";
import {
  createProductReview,
  deleteProductReview,
  fetchProductReviews,
  updateProductReview,
} from "@/lib/reviewApi";
import styles from "./ProductReviews.module.css";

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
      className={styles.ratingStars}
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
          className={`${styles.ratingStarButton} ${current >= n ? styles.isFilled : ""}`}
          aria-label={`${n} of 5`}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
      <span className={styles.ratingValue}>{current} / 5</span>
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
  const labels: Record<string, string> = {
    approved: "Approved",
    pending: "Pending",
    rejected: "Rejected",
  };
  return labels[status] ?? status;
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
  const [isAuthenticated, setIsAuthenticated] = useState(sessionStatus === "authenticated");
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [totalCount, setTotalCount] = useState<number>(reviewsCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [editingReview, setEditingReview] = useState<ProductReview | null>(null);
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

  const canSubmitReview = useMemo(
    () => canReview || Boolean(userReview),
    [canReview, userReview],
  );

  const loadReviews = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const { items, nextPage: newNextPage, totalCount: newTotal } = await fetchProductReviews({
          productSlug,
          page,
        });
        const safeItems = Array.isArray(items) ? items : [];
        setReviews((prev) => (page === 1 ? safeItems : [...prev, ...safeItems]));
        setNextPage(typeof newNextPage === "number" ? newNextPage : null);
        setTotalCount(typeof newTotal === "number" ? newTotal : safeItems.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reviews.");
      } finally {
        setLoading(false);
      }
    },
    [productSlug],
  );

  useEffect(() => {
    loadReviews().catch(() => undefined);
  }, [loadReviews]);

  const resetForm = () => {
    setForm({ ...initialFormState });
    setEditingReview(null);
    setFormVisible(false);
  };

  const handleCreateOrUpdate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const accessToken = (session as any)?.accessToken as string | undefined;
      if (editingReview) {
        const updated = await updateProductReview(
          {
            id: editingReview.id,
            rating: form.rating,
            title: form.title,
            body: form.body,
          },
          accessToken,
        );
        setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setEditingReview(null);
        setFormVisible(false);
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
        setReviews((prev) => [created, ...prev.filter((review) => review.id !== created.id)]);
        setTotalCount((prev) => prev + 1);
        setNextPage(nextPage ?? null);
        setFormVisible(false);
        setEditingReview(null);
        setForm({ ...initialFormState });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit your review. Please try again.",
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
    if (!confirm("Delete this review?")) {
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
      setError(err instanceof Error ? err.message : "Could not delete the review.");
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
    <section className={styles.reviewsContainer}>
      <header className={styles.reviewsHeader}>
        <div>
          <h2 className={styles.reviewsTitle}>Reviews</h2>
          <p className={styles.reviewsSummary}>
            {approvedCount > 0
              ? `Average rating ${derivedAverage?.toFixed(1) ?? "-"} / 5 (approved reviews: ${
                  approvedCount
                })`
              : "No approved reviews yet"}
          </p>
        </div>
        {approvedCount > 0 && (
          <span className={styles.metaPill}>
            {derivedAverage?.toFixed(1) ?? "-"} в… В· {approvedCount} reviews
          </span>
        )}
      </header>

      {error && <p className={styles.error}>{error}</p>}

      {canSubmitReview && !formVisible && (
        <button className={styles.reviewWriteButton} onClick={() => setFormVisible(true)}>
          Write a review
        </button>
      )}

      {!isAuthenticated && (
        <p className={styles.hint}>
          You can leave a review without signing in.{" "}
          <Link href="/api/auth/signin" className={styles.authLink}>
            Sign in
          </Link>{" "}
          to link it to your account.
        </p>
      )}

      {formVisible && (
        <div className={styles.reviewForm}>
          <h3 className={styles.reviewFormTitle}>{editingReview ? "Edit review" : "New review"}</h3>
          <div className={styles.formGrid}>
            <label className={styles.formLabel}>
              <span className={styles.formLabelText}>Rating</span>
              <StarRating
                value={form.rating}
                disabled={submitting}
                onChange={(next) => setForm((prev) => ({ ...prev, rating: next }))}
              />
            </label>
            {!isAuthenticated && (
              <label className={styles.formLabel}>
                <span className={styles.formLabelText}>Your name</span>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.authorName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, authorName: event.target.value }))
                  }
                  placeholder="Introduce yourself so we know how to address you"
                  disabled={submitting}
                  maxLength={120}
                />
              </label>
            )}

            <label className={styles.formLabel}>
              <span className={styles.formLabelText}>Headline</span>
              <input
                type="text"
                className={styles.formInput}
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Brief headline"
                disabled={submitting}
                maxLength={120}
              />
            </label>
            <label className={`${styles.formLabel} ${styles.formGridFull}`}>
              <span className={styles.formLabelText}>Review</span>
              <textarea
                className={styles.formTextarea}
                value={form.body}
                onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
                placeholder="Share your experience with the product"
                disabled={submitting}
              />
            </label>
          </div>
          <div className={styles.formActions}>
            <button
              className="btn btn-primary"
              onClick={handleCreateOrUpdate}
              disabled={submitting || !form.body.trim()}
            >
              {submitting ? "Sending..." : "Submit"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={resetForm}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
          <p className={styles.formNote}>
            Reviews are moderated. We may reach out by email if clarification is needed.
          </p>
        </div>
      )}

      <ul className={styles.reviewsList}>
        {(reviews ?? []).map((review) => (
          <li key={review.id} className={styles.reviewCard}>
            <div className={styles.reviewCardHeader}>
              <strong className={styles.reviewCardAuthor}>
                {review.user?.name ?? "Guest"}
              </strong>
              <span className={styles.reviewCardRating}>{`${review.rating} в…`}</span>
            </div>
            <div className={styles.reviewCardMeta}>
              <span>{formatDate(review.created_at)}</span>
              {review.verified_purchase && <span className={styles.chip}>Verified purchase</span>}
              <span
                className={`${styles.chip} ${
                  review.moderation_status === "approved"
                    ? styles.chipSuccess
                    : review.moderation_status === "pending"
                    ? styles.chipWarning
                    : styles.chipDanger
                }`}
              >
                {moderationLabel(review.moderation_status)}
              </span>
            </div>
            {review.title && <h4 className={styles.reviewCardTitle}>{review.title}</h4>}
            <p className={styles.reviewCardBody}>{review.body}</p>
            {review.is_owner && (
              <div className={styles.reviewCardActions}>
                <button
                  className={styles.actionButton}
                  onClick={() => handleEdit(review)}
                  disabled={submitting}
                >
                  Edit
                </button>
                <button
                  className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                  onClick={() => handleDelete(review.id)}
                  disabled={submitting}
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {nextPage && (
        <button className={styles.loadMoreButton} onClick={handleLoadMore} disabled={loading}>
          {loading ? "Loading..." : "Load more"}
        </button>
      )}

      {!loading && reviews.length === 0 && (
        <p className={styles.emptyMessage}>
          No reviews yet вЂ” be the first to share your experience.
        </p>
      )}
    </section>
  );
}


