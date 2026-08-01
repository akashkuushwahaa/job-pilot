import { AppNavbar } from "@/components/layout/AppNavbar";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { requireUser } from "@/lib/auth";

export default async function FindJobsPage() {
  const user = await requireUser();

  return (
    <>
      <AppNavbar active="find-jobs" userId={user.id} />
      <ComingSoon title="Find Jobs" feature="Feature 09" email={user.email} />
    </>
  );
}
