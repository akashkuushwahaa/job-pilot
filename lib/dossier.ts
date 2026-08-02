import { z } from "zod";

import { safeExternalUrl } from "@/lib/utils";
import type { CompanyDossier } from "@/types";

// Caps, not validation. GPT-4o is told to keep every item to one or two
// sentences and mostly does; these exist so that a run which ignores the
// instruction cannot write a jsonb blob the card renders as a wall of text.
const MAX_ITEMS = 8;
const MAX_ITEM_LENGTH = 400;
const MAX_PARAGRAPH_LENGTH = 1200;

// Trimmed, capped, and empty strings dropped at the array level below. A model
// that answers `["", "", ""]` has said nothing, and three blank bullets render
// as three blank bullets.
const line = z
  .string()
  .catch("")
  .transform((value) => value.trim().slice(0, MAX_ITEM_LENGTH));

const paragraph = z
  .string()
  .catch("")
  .transform((value) => value.trim().slice(0, MAX_PARAGRAPH_LENGTH));

const lines = z
  .array(line)
  .catch([])
  .transform((values) =>
    values.filter((value) => value.length > 0).slice(0, MAX_ITEMS),
  );

// The sources list becomes hrefs on the job details page, so it goes through the
// same gate feature 12 put on the two job URLs. These URLs are ours — the agent
// records the pages it actually visited rather than asking the model to name
// them — but the column is jsonb, which anything with a database token can
// write, and this is where the value becomes clickable.
const sources = z
  .array(z.string().catch(""))
  .catch([])
  .transform((values) => {
    const kept: string[] = [];

    for (const value of values) {
      const safe = safeExternalUrl(value.trim());

      if (safe !== null && !kept.includes(safe)) {
        kept.push(safe);
      }
    }

    return kept.slice(0, MAX_ITEMS);
  });

// Every field catches, which is deliberate and matches ScoreSchema in
// agent/matcher.ts: one drifted field costs that field, not the whole dossier a
// Browserbase session was spent producing. Failing the parse outright therefore
// means the value was not an object at all.
const DossierSchema = z.object({
  companyOverview: paragraph,
  techStack: lines,
  culture: lines,
  whyThisRole: paragraph,
  yourEdge: lines,
  gapsToAddress: lines,
  smartQuestions: lines,
  interviewPrep: lines,
  sources,
});

// True when every field came back empty. Writing one of these would give the
// card a "researched" state with nothing in it, which reads as a broken render
// rather than as the honest "we found nothing" it actually is.
export function isEmptyDossier(dossier: CompanyDossier): boolean {
  return (
    dossier.companyOverview.length === 0 &&
    dossier.whyThisRole.length === 0 &&
    dossier.techStack.length === 0 &&
    dossier.culture.length === 0 &&
    dossier.yourEdge.length === 0 &&
    dossier.gapsToAddress.length === 0 &&
    dossier.smartQuestions.length === 0 &&
    dossier.interviewPrep.length === 0
  );
}

// "Nothing there", "something there but it says nothing", and "not a dossier at
// all" are three different outcomes, and the write path needs to tell them
// apart: a model that answered with an empty dossier did not fail, and telling
// the user the research failed would be wrong. The read path collapses the last
// two, because the card renders its empty state either way.
export type DossierParse =
  | { kind: "dossier"; dossier: CompanyDossier }
  | { kind: "empty" }
  | { kind: "invalid" };

// The only way a CompanyDossier is ever produced — from GPT-4o's answer on the
// way in, and from the jsonb column on the way out. Postgres does not check
// jsonb structurally, so a column written by an older build, by hand, or by a
// future prompt change is exactly as untrusted as the model response was.
export function readDossier(value: unknown): DossierParse {
  if (value === null || value === undefined) {
    return { kind: "empty" };
  }

  const parsed = DossierSchema.safeParse(value);

  if (!parsed.success) {
    console.error("[lib/dossier] unreadable dossier", parsed.error.issues);
    return { kind: "invalid" };
  }

  return isEmptyDossier(parsed.data)
    ? { kind: "empty" }
    : { kind: "dossier", dossier: parsed.data };
}

// The read path. Null means "the card shows its empty state" — either because
// there is no dossier or because what is in the column is not one. Every field
// catches, so nothing short of a non-object reaches the invalid branch.
export function parseDossier(value: unknown): CompanyDossier | null {
  const result = readDossier(value);

  return result.kind === "dossier" ? result.dossier : null;
}

// True when a dossier was written by a run that actually reached the company's
// website. `sources` holds the pages the browser visited and nothing else, so
// its presence is the quality signal — see agent/research.ts, which refuses to
// replace a browsed dossier with one synthesised from the posting alone.
export function wasBrowsed(dossier: CompanyDossier): boolean {
  return dossier.sources.length > 0;
}
