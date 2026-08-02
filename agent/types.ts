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
