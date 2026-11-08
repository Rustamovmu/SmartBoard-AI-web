import { AdminLayout, type AdminPageProps } from "@/components/AdminLayout";
import { accountProps } from "@/auth/server";
import { ReportsManager } from "@/discussion/ReportsManager";
export const getServerSideProps = accountProps;
export default function Discussion(props: Omit<AdminPageProps, "denied">) {
  return (
    <AdminLayout
      {...props}
      requiredRole="ACTIVE"
      denied={false}
      heading="Your reports."
      pageTitle="Your reports"
    >
      {(account, invalidate) => (
        <ReportsManager account={account} invalidate={invalidate} />
      )}
    </AdminLayout>
  );
}
