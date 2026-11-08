import { AdminLayout, type AdminPageProps } from "@/components/AdminLayout";
import { adminProps } from "@/auth/server";
import { ReportsManager } from "@/discussion/ReportsManager";
export const getServerSideProps = adminProps;
export default function Discussion(props: AdminPageProps) {
  return (
    <AdminLayout
      {...props}
      heading="Community reports."
      pageTitle="Community reports"
    >
      {(account, invalidate) => (
        <ReportsManager account={account} invalidate={invalidate} moderation />
      )}
    </AdminLayout>
  );
}
