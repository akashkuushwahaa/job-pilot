import { ComingSoon } from "@/components/layout/ComingSoon";
import { requireUser } from "@/lib/auth";

export default async function FindJobsPage() {
  const user = await requireUser();

  return (
    <ComingSoon
      title="Find Jobs"
      feature="Feature 09"
      userId={user.id}
      email={user.email}
    />
  );
}
