import Link from "next/link";
import type { Metadata } from "next";

import { fetchPost } from "@/lib/api";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";

function buildImageUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl) {
    return undefined;
  }
  try {
    if (imageUrl.startsWith("http")) {
      return imageUrl;
    }
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    return new URL(imageUrl, base).toString();
  } catch {
    return undefined;
  }
}

type BlogPageParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<BlogPageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) {
    return {
      title: "Запись не найдена",
      robots: { index: false, follow: false },
    };
  }

  const title = post.meta_title || post.title;
  const description = post.meta_description || post.summary || SITE_NAME;
  const canonical = absoluteUrl(`/blog/${post.slug}`);
  const ogImage = buildImageUrl(post.og_image) ?? DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      siteName: SITE_NAME,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

type BlogPostPageProps = {
  params: Promise<BlogPageParams>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await fetchPost(slug);

  if (!post) {
    return (
      <section className="section">
        <div className="container">
          <h1>Запись не найдена</h1>
        </div>
      </section>
    );
  }

  const ogImage = buildImageUrl(post.og_image);

  return (
    <section className="section">
      <div className="container blog-post">
        <div className="blog-post__header">
          <Link className="btn btn-outline" href="/blog">
            ← Назад к блогу
          </Link>
          <p className="blog-post__date">
            {post.published_at
              ? new Date(post.published_at).toLocaleDateString("ru-RU")
              : "Draft"}
          </p>
          <h1>{post.meta_title || post.title}</h1>
          {post.meta_keywords && (
            <p className="blog-post__keywords">
              Ключевые слова: {post.meta_keywords}
            </p>
          )}
          {post.tags.length > 0 && (
            <p className="blog-post__keywords">Теги: {post.tags.join(", ")}</p>
          )}
        </div>
        {ogImage && (
          <div className="blog-post__cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ogImage} alt={post.title} />
          </div>
        )}
        <article
          className="blog-post__body"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />
      </div>
    </section>
  );
}
