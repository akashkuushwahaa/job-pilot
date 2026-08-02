import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import type { ResumeContent, ResumeRole } from "@/lib/resume-generation";
import type { Profile } from "@/types";

// A PDF has no CSS variables and no Tailwind, so the "never hardcode a hex"
// rule in ui-rules.md cannot apply literally here. These are the ui-tokens.md
// values, named after their tokens and declared once, so the document still has
// a single place to change and still traces back to the design system.
const COLOR = {
  textPrimary: "#101828",
  textSecondary: "#6A7282",
  accent: "#7C5CFC",
  border: "#E7EAF3",
} as const;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

// Helvetica is built into every PDF reader. Registering Inter would mean
// fetching a font file inside a request and embedding it in every document —
// ui-tokens.md governs the app, not a file that leaves it.
const styles = StyleSheet.create({
  page: {
    paddingVertical: 40,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    color: COLOR.textPrimary,
  },
  name: { fontSize: 22, fontWeight: "bold", letterSpacing: 0.2 },
  title: { fontSize: 11, color: COLOR.accent, marginTop: 4 },
  contact: {
    fontSize: 9,
    color: COLOR.textSecondary,
    marginTop: 8,
    lineHeight: 1.5,
  },
  rule: {
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
    marginTop: 14,
  },
  section: { marginTop: 16 },
  sectionHeading: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: COLOR.accent,
    marginBottom: 6,
  },
  body: { fontSize: 9.5, lineHeight: 1.55 },
  roleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  roleTitle: { fontSize: 10.5, fontWeight: "bold" },
  roleCompany: { fontSize: 9.5, color: COLOR.textSecondary, marginTop: 2 },
  rolePeriod: { fontSize: 9, color: COLOR.textSecondary },
  role: { marginBottom: 12 },
  bulletRow: { flexDirection: "row", marginTop: 4 },
  bulletMark: { fontSize: 9.5, width: 10, color: COLOR.textSecondary },
  bulletText: { fontSize: 9.5, lineHeight: 1.5, flex: 1 },
  educationInstitution: { fontSize: 9.5, color: COLOR.textSecondary, marginTop: 2 },
});

// "2022-03" -> "Mar 2022". Anything the month input did not produce renders as
// nothing rather than as a half-parsed date.
function formatMonth(value: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);

  if (match === null) {
    return "";
  }

  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

function formatPeriod(role: ResumeRole): string {
  const start = formatMonth(role.start_date);
  const end = role.currently_working ? "Present" : formatMonth(role.end_date ?? "");

  if (start.length === 0) {
    return end;
  }

  return end.length > 0 ? `${start} — ${end}` : start;
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function contactLine(profile: Profile): string {
  const parts = [
    profile.email,
    profile.phone,
    profile.location,
    profile.linkedin_url === null ? null : stripProtocol(profile.linkedin_url),
    profile.portfolio_url === null ? null : stripProtocol(profile.portfolio_url),
  ];

  return parts
    .filter((part): part is string => part !== null && part.trim().length > 0)
    .join("  ·  ");
}

function educationLine(profile: Profile): string | null {
  const education = profile.education;

  if (education === null) {
    return null;
  }

  const qualification = [education.degree, education.field]
    .filter((part) => part.trim().length > 0)
    .join(" in ");

  const year = education.graduation_year.trim();

  return year.length > 0 ? `${qualification}, ${year}` : qualification;
}

type Props = {
  profile: Profile;
  content: ResumeContent;
};

function ResumeDocument({ profile, content }: Props) {
  const contact = contactLine(profile);
  const education = educationLine(profile);

  return (
    <Document
      title={`${profile.full_name ?? "Resume"} — Resume`}
      author={profile.full_name ?? undefined}
      creator="JobPilot"
      producer="JobPilot"
    >
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.name}>{profile.full_name ?? ""}</Text>
          {profile.current_title === null ? null : (
            <Text style={styles.title}>{profile.current_title}</Text>
          )}
          {contact.length > 0 ? (
            <Text style={styles.contact}>{contact}</Text>
          ) : null}
        </View>

        <View style={styles.rule} />

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Summary</Text>
          <Text style={styles.body}>{content.summary}</Text>
        </View>

        {profile.skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Skills</Text>
            <Text style={styles.body}>{profile.skills.join("  ·  ")}</Text>
          </View>
        ) : null}

        {content.roles.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Experience</Text>
            {content.roles.map((role, index) => (
              <View key={`${role.company}-${role.title}-${index}`} style={styles.role}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <Text style={styles.rolePeriod}>{formatPeriod(role)}</Text>
                </View>
                {role.company.length > 0 ? (
                  <Text style={styles.roleCompany}>{role.company}</Text>
                ) : null}
                {role.bullets.map((bullet, bulletIndex) => (
                  <View key={bulletIndex} style={styles.bulletRow}>
                    <Text style={styles.bulletMark}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {education === null ? null : (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Education</Text>
            <Text style={styles.body}>{education}</Text>
            {profile.education !== null &&
            profile.education.institution.trim().length > 0 ? (
              <Text style={styles.educationInstitution}>
                {profile.education.institution}
              </Text>
            ) : null}
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function renderResumePdf(
  profile: Profile,
  content: ResumeContent,
): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument profile={profile} content={content} />);
}
