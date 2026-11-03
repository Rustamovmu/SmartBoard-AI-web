import type { AccountsInput } from "@/graphql/generated";

export function accountFilters(
  query: Record<string, string | string[] | undefined>,
): AccountsInput {
  const number = (key: string, fallback: number, maximum: number) => {
    const value = query[key];
    return typeof value === "string" &&
      /^[1-9]\d*$/.test(value) &&
      Number(value) <= maximum
      ? Number(value)
      : fallback;
  };
  const pageSize = number("pageSize", 20, 100);
  return {
    page: number("page", 1, 10000),
    pageSize: [20, 50, 100].includes(pageSize) ? pageSize : 20,
    ...(query.role === "USER" || query.role === "ADMIN"
      ? { role: query.role }
      : {}),
    ...(query.status === "ACTIVE" ||
    query.status === "BLOCKED" ||
    query.status === "DELETED"
      ? { status: query.status }
      : {}),
  };
}
