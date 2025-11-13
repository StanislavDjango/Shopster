import algoliasearch from "algoliasearch/lite";

export function getAlgoliaSearchClient() {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;
  if (!appId || !searchKey) {
    console.warn(
      "Algolia environment variables are missing. Search will be disabled.",
    );
    return null;
  }
  return algoliasearch(appId, searchKey);
}

export const ALGOLIA_INDEX =
  process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? "shop_products";
