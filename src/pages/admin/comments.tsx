import { AdminLayout, type AdminPageProps } from "@/components/AdminLayout";
import { adminProps } from "@/auth/server";
import { CommentsManager } from "@/discussion/CommentsManager";
export const getServerSideProps = adminProps;
export default function Discussion(props: AdminPageProps) {
  return (
    <AdminLayout
      {...props}
      heading="Community comments."
      pageTitle="Community comments"
    >
      {(account, invalidate) => (
        <CommentsManager account={account} invalidate={invalidate} moderation />
      )}
    </AdminLayout>
  );
}
