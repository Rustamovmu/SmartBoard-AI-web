import { AdminLayout, type AdminPageProps } from "@/components/AdminLayout";
import { accountProps } from "@/auth/server";
import { CommunityManager } from "@/community/CommunityManager";
export const getServerSideProps = accountProps;
export default function Posts(props: Omit<AdminPageProps, "denied">) {
  return (
    <AdminLayout
      {...props}
      denied={false}
      requiredRole="ACTIVE"
      heading="Your posts."
      pageTitle="Your community posts"
    >
      {(account, invalidate) => (
        <CommunityManager account={account} invalidate={invalidate} />
      )}
    </AdminLayout>
  );
}
