import type { GetServerSidePropsContext } from "next";
import { PasswordResetForm } from "@/components/PasswordResetForm";
export function getServerSideProps({ query, res }: GetServerSidePropsContext) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  // Proofs are accepted only by manual form entry, never URL prefill or page props.
  if (Object.keys(query).length)
    return { redirect: { destination: "/reset-password", permanent: false } };
  return { props: {} };
}
export default function PasswordReset() {
  return <PasswordResetForm />;
}
