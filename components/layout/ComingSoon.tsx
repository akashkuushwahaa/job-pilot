type Props = {
  title: string;
  feature: string;
  email: string;
};

// Throwaway scaffolding for routes that exist only to prove auth works — delete
// each usage as features 09 and 14 land. It no longer carries the logo or the
// sign-out button: AppNavbar sits above it and owns both.
export function ComingSoon({ title, feature, email }: Props) {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-xs font-medium tracking-widest text-accent uppercase">
            {feature}
          </p>
          <h1 className="mt-2 text-base font-semibold text-text-primary">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            This page is not built yet. You are seeing it because the session is
            working — a signed-out visitor is redirected to the login page.
          </p>

          <dl className="mt-6 border-t border-border pt-6">
            <dt className="text-xs font-medium tracking-wider text-text-muted uppercase">
              Signed in as
            </dt>
            <dd className="mt-1 text-sm font-medium text-text-primary">
              {email}
            </dd>
          </dl>
        </div>
      </div>
    </main>
  );
}
