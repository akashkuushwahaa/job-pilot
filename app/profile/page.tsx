import { AppNavbar } from "@/components/layout/AppNavbar";
import { CompletionIndicator } from "@/components/profile/CompletionIndicator";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import { requireUser } from "@/lib/auth";
import { completeness } from "@/lib/completeness";
import type { Profile } from "@/types";

// Mock data. Feature 06 replaces this with a read from the profiles table —
// which returns no row until the first save, so that read must handle null and
// pass it straight through to completeness().
function mockProfile(userId: string, email: string): Profile {
  return {
    id: userId,
    full_name: "Faizan Ali",
    email,
    phone: null,
    location: null,
    current_title: "Frontend Engineer",
    experience_level: "junior",
    years_experience: 4,
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    industries: [],
    work_experience: [
      {
        company: "Vercel",
        title: "Frontend Engineer",
        start_date: "2022-01",
        end_date: null,
        currently_working: true,
        responsibilities:
          "Built Next.js features and optimized web vitals. Led a team of 3 developers.",
      },
    ],
    education: {
      degree: "High School",
      field: "Computer Science",
      institution: "",
      graduation_year: "",
    },
    job_titles_seeking: ["Frontend Engineer", "React Developer"],
    remote_preference: "any",
    preferred_locations: [],
    salary_expectation: null,
    linkedin_url: "https://linkedin.com/in/faizan",
    portfolio_url: "https://github.com/jsmastery",
    work_authorization: "citizen",
    resume_path: null,
  };
}

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = mockProfile(user.id, user.email ?? "");
  const { percent, missing, isComplete } = completeness(profile);

  return (
    <>
      <AppNavbar active="profile" userId={user.id} />

      <main className="flex-1 bg-background">
        <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
          <CompletionIndicator
            percent={percent}
            missing={missing}
            isComplete={isComplete}
          />
          <ResumeUpload />
          <ProfileForm profile={profile} />
        </div>
      </main>
    </>
  );
}
