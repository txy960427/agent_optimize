import type {
  Investigation,
  Observation,
  PracticeState,
  StepCheck,
} from "./data";
import { deriveDecision } from "./data";
import {
  mappingFor,
  messagesOf,
  roleOf,
  contextGroup,
  type RealTrace,
} from "../api/realData";

export const emptyCheck = (): StepCheck => ({
  expected: "",
  verdict: "",
  note: "",
  missing: "",
});
export function practiceState(inv: Investigation): PracticeState {
  return (
    inv.practice ?? {
      pane: inv.stage === 1 ? "judge" : "inspect",
      scope: "all",
      stepChecks: {
        [inv.loop]: {
          expected: inv.expected,
          verdict: "",
          note: inv.symptom,
          missing: inv.pending,
        },
      },
      rootSubmitted: inv.stage >= 3,
    }
  );
}
export function stepsFor(trace: RealTrace, inv: Investigation) {
  const byId = new Map(trace.observations.map((o) => [o.id, o]));
  return mappingFor(trace, inv).loops.map((loop) => {
    const records = Object.values(loop.phaseRecords)
      .flatMap((ids) => ids ?? [])
      .map((id) => byId.get(id))
      .filter((o): o is Observation => !!o);
    const models = (loop.modelIds ?? [])
      .map((id) => byId.get(id))
      .filter((o): o is Observation => !!o);
    const model = models[0];
    const messages = messagesOf(model?.input) ?? [];
    const feedback = messages.filter(
      (m, i) =>
        contextGroup(m, i, messages) === "feedback" && roleOf(m) === "tool",
    );
    return {
      loop,
      records,
      models,
      model,
      messages,
      feedback,
      actions: (loop.phaseRecords[4] ?? [])
        .map((id) => byId.get(id))
        .filter((o): o is Observation => !!o),
      errors: records.filter((o) => o.level === "ERROR"),
    };
  });
}
export function associatedModels(trace: RealTrace, inv: Investigation) {
  const steps = stepsFor(trace, inv),
    step = steps.find((s) => s.loop.index === inv.loop);
  if (!step) return [];
  const calls = new Set<string>();
  for (const action of step.actions)
    for (const m of messagesOf(action.output) ?? []) {
      const id =
        m.tool_call_id ??
        (m.kwargs as Record<string, unknown> | undefined)?.tool_call_id;
      if (typeof id === "string") calls.add(id);
    }
  return steps
    .flatMap((s) =>
      s.models.map((model) => ({
        model,
        step: s.loop.index,
        own: s.loop.index === inv.loop,
      })),
    )
    .filter(
      (item) =>
        item.own ||
        (item.step > inv.loop &&
          (messagesOf(item.model.input) ?? []).some((m) =>
            calls.has(
              String(
                m.tool_call_id ??
                  (m.kwargs as Record<string, unknown> | undefined)
                    ?.tool_call_id ??
                  "",
              ),
            ),
          )),
    );
}
// Preserve the previous decisions for review when their basis changes.
export function resetDecisions(
  inv: Investigation,
  reason: string,
): Partial<Investigation> {
  return {
    answers: {},
    decisionNotes: {},
    verdicts: { complete: "", precise: "", consistent: "" },
    notes: { complete: "", precise: "", consistent: "" },
    pending: "",
    noIssue: false,
    verificationResult: "",
    history: [
      ...inv.history,
      reason +
        "；原判断：" +
        JSON.stringify({
          loop: inv.loop,
          model: inv.modelObservationId,
          verdicts: inv.verdicts,
          notes: inv.notes,
          answers: inv.answers,
          decisionNotes: inv.decisionNotes,
          verificationResult: inv.verificationResult,
        }),
    ],
  };
}
export function keepAnswersBefore(inv: Investigation, node: string) {
  const path = deriveDecision(inv.verdicts, inv.answers).path;
  const index = path.findIndex((p) => p.id === node);
  const before = index < 0 ? path : path.slice(0, index);
  const ids = new Set(before.map((p) => p.id));
  return {
    answers: Object.fromEntries(
      Object.entries(inv.answers).filter(([id]) => ids.has(id)),
    ),
    decisionNotes: Object.fromEntries(
      Object.entries(inv.decisionNotes).filter(([id]) => ids.has(id)),
    ),
  };
}
