"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import {
  Configure,
  InstantSearch,
  SearchBox,
  useHits,
  useSearchBox,
  useInstantSearch,
} from "react-instantsearch-hooks-web";
import type { Hit } from "instantsearch.js";

import { ALGOLIA_INDEX, getAlgoliaSearchClient } from "@/lib/algolia";

type SearchHit = Hit<{
  name: string;
  price: number;
  currency: string;
  short_description: string;
  category: string;
  image_url: string;
  slug: string;
}>;

const MIN_QUERY_LENGTH = 2;

function createSearchClient() {
  const baseClient = getAlgoliaSearchClient();
  if (!baseClient) {
    return null;
  }

  return {
    ...baseClient,
    search(requests: any[]) {
      const shouldThrottle = requests.every(({ params }) => {
        const query = params?.query ?? "";
        return !query || query.trim().length < MIN_QUERY_LENGTH;
      });

      if (shouldThrottle) {
        return Promise.resolve({
          results: requests.map(() => ({
            hits: [],
            nbHits: 0,
            page: 0,
            nbPages: 0,
            hitsPerPage: 5,
            exhaustiveNbHits: false,
            query: "",
            params: "",
            processingTimeMS: 0,
          })),
        });
      }

      return baseClient.search(requests);
    },
  };
}

function SearchDropdown() {
  const { query } = useSearchBox();
  const trimmedQuery = (query || "").trim();
  const { hits } = useHits<SearchHit>();
  const { results } = useInstantSearch();
  const totalHits = results?.nbHits ?? hits.length;

  if (trimmedQuery.length < MIN_QUERY_LENGTH || !hits.length) {
    return null;
  }

  return (
    <ul className="header-search__dropdown">
      {hits.map((hit) => {
        const price = hit.price?.toLocaleString("ru-RU", {
          style: "currency",
          currency: hit.currency ?? "RUB",
        });
        const imageUrl =
          hit.image_url && !hit.image_url.startsWith("http")
            ? `${process.env.NEXT_PUBLIC_API_BASE_URL}${hit.image_url}`
            : hit.image_url;

        return (
          <li key={hit.objectID}>
            <Link href={`/products/${hit.slug}`}>
              {imageUrl ? (
                <Image
                  className="header-search__thumb"
                  src={imageUrl}
                  alt={hit.name}
                  width={48}
                  height={48}
                />
              ) : (
                <div className="header-search__thumb placeholder">Нет фото</div>
              )}
              <div className="header-search__meta">
                <span className="header-search__price">{price}</span>
                <span className="header-search__title">{hit.name}</span>
                {hit.category && (
                  <span className="header-search__category">
                    {hit.category}
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
      <li className="header-search__footer">
        <Link href={`/products?search=${encodeURIComponent(trimmedQuery)}`}>
          Show all results ({totalHits})
        </Link>
      </li>
    </ul>
  );
}

export function AlgoliaSearch() {
  const searchClient = useMemo(() => createSearchClient(), []);

  if (!searchClient) {
    return null;
  }

  return (
    <InstantSearch searchClient={searchClient} indexName={ALGOLIA_INDEX}>
      <Configure {...({ hitsPerPage: 5 } as any)} />
      <div className="header-search">
        <SearchBox placeholder="Поиск товаров…" />
        <SearchDropdown />
      </div>
    </InstantSearch>
  );
}
