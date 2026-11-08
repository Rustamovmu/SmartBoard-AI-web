export const reasons = [
  "SPAM",
  "ABUSE",
  "PRIVACY",
  "OFF_TOPIC",
  "OTHER",
] as const;
export function uuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      value,
    )
  );
}
export function boundedPage(value: unknown) {
  return typeof value === "string" &&
    /^[1-9]\d*$/.test(value) &&
    Number(value) <= 10000
    ? Number(value)
    : 1;
}
