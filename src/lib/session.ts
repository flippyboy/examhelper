import type { Exam, Question, SessionConfig, SessionState } from "../types/exam";

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildSession(exam: Exam, config: SessionConfig): SessionState {
  const allowed = new Set(config.domainIds);
  let pool = exam.questions.filter((q) => allowed.has(q.domain));
  pool = shuffle(pool);
  if (config.questionLimit && config.questionLimit < pool.length) {
    pool = pool.slice(0, config.questionLimit);
  }
  const now = Date.now();
  const choiceOrder: Record<string, string[]> = {};
  for (const q of pool) {
    if (!q.choices || q.choices.length < 2 || q.type === "truefalse") continue;
    choiceOrder[q.id] = shuffle(q.choices.map((c) => c.id));
  }
  return {
    id: `${exam.id}-${now}`,
    examId: exam.id,
    config,
    questionIds: pool.map((q) => q.id),
    choiceOrder,
    currentIndex: 0,
    answers: {},
    flagged: [],
    submitted: {},
    startedAt: now,
    endsAt: config.timed ? now + exam.timeLimitMinutes * 60_000 : null,
    finishedAt: null,
  };
}

export function withChoiceOrder(question: Question, order?: string[]): Question {
  if (!question.choices || !order?.length) return question;
  const byId = new Map(question.choices.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const choices = [];
  for (const id of order) {
    const choice = byId.get(id);
    if (choice) {
      choices.push(choice);
      seen.add(id);
    }
  }
  for (const choice of question.choices) {
    if (!seen.has(choice.id)) choices.push(choice);
  }
  return { ...question, choices };
}

export function remainingMs(session: SessionState, now = Date.now()): number | null {
  if (session.endsAt === null) return null;
  return Math.max(0, session.endsAt - now);
}

export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function setAnswer(session: SessionState, questionId: string, value: string[]): SessionState {
  return { ...session, answers: { ...session.answers, [questionId]: value } };
}

export function toggleFlag(session: SessionState, questionId: string): SessionState {
  const flagged = session.flagged.includes(questionId)
    ? session.flagged.filter((id) => id !== questionId)
    : [...session.flagged, questionId];
  return { ...session, flagged };
}

export function markSubmitted(session: SessionState, questionId: string): SessionState {
  return { ...session, submitted: { ...session.submitted, [questionId]: true } };
}

export function goTo(session: SessionState, index: number): SessionState {
  const max = session.questionIds.length - 1;
  const next = Math.min(max, Math.max(0, index));
  return { ...session, currentIndex: next };
}

export function finish(session: SessionState): SessionState {
  return { ...session, finishedAt: Date.now() };
}

export function hasAnswer(session: SessionState, questionId: string): boolean {
  const given = session.answers[questionId];
  if (!given || given.length === 0) return false;
  return given.some((v) => v.trim() !== "");
}
