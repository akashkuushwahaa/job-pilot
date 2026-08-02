import type { CompanyDossier } from "@/types";

// GPT-4o's judgement on one job against one profile. Every field here is an
// opinion the model formed — no job fact passes through this shape.
export type JobScore = {
  matchScore: number;
  matchReason: string;
  matchedSkills: string[];
  missingSkills: string[];
};

// What one discovery run reports back. `savedScores` carries the match score of
// every row actually written, which is everything the caller needs: its length
// is the count found, and lib/jobs.ts turns it into the banner sentence and the
// per-job PostHog events. Jobs that failed scoring are absent by construction.
export type DiscoveryResult =
  | { success: true; savedScores: number[] }
  | { success: false; error: string };

// What one research run reports back. `browsed` and `descriptionUpdated` are
// both false on a perfectly successful run — the browser can find a parked
// domain and the posting can be behind a JS-rendered board — so the route uses
// them to say what actually happened rather than to decide whether it worked.
// Only a missing dossier is a failure, because a dossier is the deliverable.
export type ResearchResult =
  | {
      success: true;
      dossier: CompanyDossier;
      browsed: boolean;
      descriptionUpdated: boolean;
    }
  | { success: false; error: string };
