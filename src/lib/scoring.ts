import type { DomainScore, Exam, Question, SessionState } from "../types/exam";

export function isCorrect(question: Question, given: string[] | undefined): boolean {
  if (!given || given.length === 0) return false;
  if (question.type === "fill") {
    const value = (given[0] ?? "").trim().toLowerCase();
    return question.answer.some((a) => a.trim().toLowerCase() === value);
  }
  if (given.length !== question.answer.length) return false;
  const a = [...given].sort();
  const b = [...question.answer].sort();
  return a.every((v, i) => v === b[i]);
}

export function scoreSession(exam: Exam, session: SessionState): {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  domainScores: DomainScore[];
} {
  const byId = new Map(exam.questions.map((q) => [q.id, q]));
  const questions = session.questionIds.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));
  let correct = 0;
  const domainMap = new Map<string, DomainScore>();
  for (const domain of exam.domains) {
    domainMap.set(domain.id, { id: domain.id, name: domain.name, correct: 0, total: 0 });
  }
  for (const q of questions) {
    const ok = isCorrect(q, session.answers[q.id]);
    if (ok) correct += 1;
    const bucket = domainMap.get(q.domain);
    if (bucket) {
      bucket.total += 1;
      if (ok) bucket.correct += 1;
    }
  }
  const total = questions.length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return {
    correct,
    total,
    percent,
    passed: percent >= exam.passPercent,
    domainScores: [...domainMap.values()].filter((d) => d.total > 0),
  };
}
