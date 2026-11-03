import { AdminLayout, type AdminPageProps } from "@/components/AdminLayout";
import { Accounts } from "@/admin/Accounts";
import { adminProps } from "@/auth/server";
export const getServerSideProps = adminProps;
export default function AdminUsers(props: AdminPageProps) {
  return (
    <AdminLayout {...props}>
      {(account, invalidate) => (
        <Accounts account={account} invalidate={invalidate} />
      )}
    </AdminLayout>
  );
}
