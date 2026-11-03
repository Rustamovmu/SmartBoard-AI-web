import type { CommunityState } from "@/graphql/generated";
export function communityFilters(
  query: Record<string, string | string[] | undefined>,
) {
  const bounded = (value: unknown, fallback: number, max: number) =>
    typeof value === "string" &&
    /^[1-9]\d*$/.test(value) &&
    Number(value) <= max
      ? Number(value)
      : fallback;
  const state =
    typeof query.state === "string" &&
    ["DRAFT", "PUBLISHED", "REMOVED"].includes(query.state)
      ? (query.state as CommunityState)
      : undefined;
  return {
    page: bounded(query.page, 1, 10000),
    pageSize: bounded(query.pageSize, 20, 100),
    ...(state ? { state } : {}),
  };
}
