import { ComingSoon } from "@/components/layout/ComingSoon";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <ComingSoon
      title="Dashboard"
      feature="Feature 14"
      userId={user.id}
      email={user.email}
    />
  );
}
