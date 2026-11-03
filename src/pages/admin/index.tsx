import type { GetServerSidePropsContext } from "next";
import { adminProps } from "@/auth/server";
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const result = await adminProps(context);
  if ("redirect" in result) return result;
  // Keep denial/unavailable handling in the shared protected users page.
  return { redirect: { destination: "/admin/users", permanent: false } };
}
export default function AdminIndex() {
  return null;
}
