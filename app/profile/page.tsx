import { ComingSoon } from "@/components/layout/ComingSoon";
import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <ComingSoon
      title="Profile"
      feature="Feature 05"
      userId={user.id}
      email={user.email}
    />
  );
}
