import { AdminLayout, type AdminPageProps } from "@/components/AdminLayout";
import { accountProps } from "@/auth/server";
import { CommentsManager } from "@/discussion/CommentsManager";
export const getServerSideProps = accountProps;
export default function Discussion(props: Omit<AdminPageProps, "denied">) {
  return (
    <AdminLayout
      {...props}
      requiredRole="ACTIVE"
      denied={false}
      heading="Your comments."
      pageTitle="Your comments"
    >
      {(account, invalidate) => (
        <CommentsManager account={account} invalidate={invalidate} />
      )}
    </AdminLayout>
  );
}
