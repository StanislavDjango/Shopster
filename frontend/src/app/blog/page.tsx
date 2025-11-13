import type { Metadata } from "next";

import { fetchPosts } from "@/lib/api";
import { SITE_NAME } from "@/lib/seo";

const POSTS_PER_PAGE = 10;

export const metadata: Metadata = {
  title: `Blog · ${SITE_NAME}`,
  description: "Статьи, новости и материалы магазинов Shopster.",
};

type BlogPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeParam(value?: string | string[]): string | undefined {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value?: string): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 1;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = searchParams ? await searchParams : {};
  const page = parsePage(normalizeParam(params.page));
  const tag = normalizeParam(params.tag);
  const query = normalizeParam(params.search);

  const postsResponse = await fetchPosts({
    page,
    pageSize: POSTS_PER_PAGE,
    query: {
      tag,
      search: query,
    },
  });

  return (
    <section className="section">
      <div className="container blog-container">
        <div className="section-header">
          <h1>Blog</h1>
          <p>Последние новости, подборки и обзоры магазина.</p>
        </div>
        <div className="blog-grid">
          {postsResponse.items.length === 0 ? (
            <p>Записей пока нет.</p>
          ) : (
            postsResponse.items.map((post) => (
              <article key={post.slug} className="blog-card">
                <div className="blog-card__header">
                  <span className="blog-card__date">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString("ru-RU")
                      : "Draft"}
                  </span>
                  {post.tags.length > 0 && (
                    <span className="blog-card__tags">
                      {post.tags.join(", ")}
                    </span>
                  )}
                </div>
                <h2>{post.title}</h2>
                <p>{post.summary || post.meta_description}</p>
                <a className="btn btn-outline" href={`/blog/${post.slug}`}>
                  Читать далее
                </a>
              </article>
            ))
          )}
        </div>
        {postsResponse.nextPage && (
          <div className="blog-pagination">
            <a
              className="btn btn-secondary"
              href={`/blog?page=${postsResponse.nextPage}`}
            >
              Следующая страница
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
