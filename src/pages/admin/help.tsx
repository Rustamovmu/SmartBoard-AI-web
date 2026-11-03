import { AdminLayout, type AdminPageProps } from "@/components/AdminLayout";
import { HelpManager } from "@/admin/HelpManager";
import { adminProps } from "@/auth/server";
export const getServerSideProps = adminProps;
export default function AdminHelp(props: AdminPageProps) {
  return (
    <AdminLayout
      {...props}
      heading="Help center."
      pageTitle="Help administration"
    >
      {(account, invalidate) => (
        <HelpManager account={account} invalidate={invalidate} />
      )}
    </AdminLayout>
  );
}
