import { AdminLayout, type AdminPageProps } from "@/components/AdminLayout";
import { adminProps } from "@/auth/server";
import { CommunityManager } from "@/community/CommunityManager";
export const getServerSideProps = adminProps;
export default function CommunityModeration(props: AdminPageProps) {
  return (
    <AdminLayout
      {...props}
      heading="Community moderation."
      pageTitle="Community moderation"
    >
      {(account, invalidate) => (
        <CommunityManager
          account={account}
          invalidate={invalidate}
          moderation
        />
      )}
    </AdminLayout>
  );
}
