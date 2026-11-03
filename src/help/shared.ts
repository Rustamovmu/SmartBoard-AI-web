import type { HelpKind, HelpTopic } from "@/graphql/generated";
export const topics: HelpTopic[] = [
  "GENERAL",
  "ACCOUNTS",
  "DEVICES",
  "LOCAL_STORAGE",
  "PRIVACY",
  "OTHER",
];
export const topicLabel = (topic: string) =>
  topic === "LOCAL_STORAGE"
    ? "Local storage"
    : topic.charAt(0) + topic.slice(1).toLowerCase();
export function helpFilters(
  query: Record<string, string | string[] | undefined>,
) {
  const kind: HelpKind = query.kind === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : "FAQ";
  const page =
    typeof query.page === "string" &&
    /^[1-9]\d*$/.test(query.page) &&
    Number(query.page) <= 10000
      ? Number(query.page)
      : 1;
  return {
    kind,
    page,
    pageSize: 20,
    ...(kind === "FAQ" &&
    typeof query.topic === "string" &&
    topics.includes(query.topic as HelpTopic)
      ? { topic: query.topic as HelpTopic }
      : {}),
  };
}
export function helpDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
