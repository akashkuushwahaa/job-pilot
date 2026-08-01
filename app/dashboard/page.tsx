import { AppNavbar } from "@/components/layout/AppNavbar";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <>
      <AppNavbar active="dashboard" userId={user.id} />
      <ComingSoon title="Dashboard" feature="Feature 14" email={user.email} />
    </>
  );
}
