export type Manifest = {
  version: string;
  traceCount: number;
  sessionCount: number;
  tracesWithoutSession: number;
  observationCount: number;
  errorCount: number;
  earliest: string;
  latest: string;
  caseCount: number;
  sources: { name: string; bytes: number; modifiedAt: string }[];
  conflicts: { id: string; kept: string; alternative: string }[];
  mode: string;
};
