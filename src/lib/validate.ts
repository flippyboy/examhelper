import type { Catalog, Exam, Question } from "../types/exam";

const ID_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const TYPES = new Set(["single", "multi", "truefalse", "fill"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function validateExam(data: unknown): Exam {
  if (!isRecord(data)) throw new Error("Exam pack is not an object");
  if (!str(data.id) || !ID_RE.test(data.id)) throw new Error("Invalid exam id");
  if (!str(data.title) || !str(data.vendor) || !str(data.version) || !str(data.description)) {
    throw new Error("Exam is missing title, vendor, version, or description");
  }
  if (data.unofficial !== true) throw new Error("Exam must set unofficial: true");
  if (!Number.isInteger(data.passPercent) || (data.passPercent as number) < 1 || (data.passPercent as number) > 100) {
    throw new Error("passPercent must be 1–100");
  }
  if (!Number.isInteger(data.timeLimitMinutes) || (data.timeLimitMinutes as number) < 1) {
    throw new Error("timeLimitMinutes must be a positive integer");
  }
  if (!Array.isArray(data.domains) || data.domains.length < 1) throw new Error("Exam needs domains");
  const domains = data.domains.map((d, i) => {
    if (!isRecord(d) || !str(d.id) || !str(d.name) || typeof d.weight !== "number") {
      throw new Error(`Invalid domain at index ${i}`);
    }
    return { id: d.id, name: d.name, weight: d.weight };
  });
  const domainIds = new Set(domains.map((d) => d.id));
  if (domainIds.size !== domains.length) throw new Error("Duplicate domain id");
  if (!Array.isArray(data.questions) || data.questions.length < 1) throw new Error("Exam needs questions");
  const questions = data.questions.map((q, i) => parseQuestion(q, i, domainIds));
  const ids = new Set(questions.map((q) => q.id));
  if (ids.size !== questions.length) throw new Error("Duplicate question id");
  return {
    id: data.id,
    title: data.title,
    vendor: data.vendor,
    code: str(data.code) ? data.code : undefined,
    version: data.version,
    description: data.description,
    unofficial: true,
    passPercent: data.passPercent as number,
    timeLimitMinutes: data.timeLimitMinutes as number,
    domains,
    questions,
  };
}

function parseQuestion(raw: unknown, index: number, domainIds: Set<string>): Question {
  if (!isRecord(raw)) throw new Error(`Question ${index} is not an object`);
  const loc = `Question ${String(raw.id ?? index)}`;
  if (!str(raw.id) || !str(raw.type) || !str(raw.domain) || !str(raw.objective) || !str(raw.stem) || !str(raw.explanation)) {
    throw new Error(`${loc} is missing required fields`);
  }
  if (!TYPES.has(raw.type)) throw new Error(`${loc}: unknown type`);
  if (!domainIds.has(raw.domain)) throw new Error(`${loc}: unknown domain`);
  if (!Array.isArray(raw.answer) || raw.answer.length < 1 || !raw.answer.every((a) => typeof a === "string")) {
    throw new Error(`${loc}: answer must be a non-empty string array`);
  }
  const question: Question = {
    id: raw.id,
    type: raw.type as Question["type"],
    domain: raw.domain,
    objective: raw.objective,
    stem: raw.stem,
    answer: raw.answer as string[],
    explanation: raw.explanation,
  };
  if (Array.isArray(raw.references)) {
    question.references = raw.references.map((r) => {
      if (!isRecord(r) || !str(r.title)) throw new Error(`${loc}: invalid reference`);
      return { title: r.title, url: str(r.url) ? r.url : undefined };
    });
  }
  if (question.type === "fill") return question;
  if (!Array.isArray(raw.choices) || raw.choices.length < 2) throw new Error(`${loc}: need choices`);
  question.choices = raw.choices.map((c) => {
    if (!isRecord(c) || !str(c.id) || !str(c.text)) throw new Error(`${loc}: invalid choice`);
    return { id: c.id, text: c.text };
  });
  const choiceIds = new Set(question.choices.map((c) => c.id));
  if (choiceIds.size !== question.choices.length) throw new Error(`${loc}: duplicate choice id`);
  for (const a of question.answer) {
    if (!choiceIds.has(a)) throw new Error(`${loc}: answer ${a} is not a choice`);
  }
  if (question.type === "multi") {
    if (!Number.isInteger(raw.selectCount) || (raw.selectCount as number) < 2) {
      throw new Error(`${loc}: selectCount required`);
    }
    question.selectCount = raw.selectCount as number;
  }
  return question;
}

export function validateCatalog(data: unknown): Catalog {
  if (!isRecord(data) || !Array.isArray(data.exams)) throw new Error("catalog.json must have exams[]");
  const exams = data.exams.map((e, i) => {
    if (!isRecord(e) || !str(e.id) || !str(e.title) || !str(e.vendor) || !str(e.path)) {
      throw new Error(`catalog entry ${i} is invalid`);
    }
    return {
      id: e.id,
      title: e.title,
      vendor: e.vendor,
      version: str(e.version) ? e.version : "1",
      path: e.path,
      questionCount: typeof e.questionCount === "number" ? e.questionCount : 0,
      timeLimitMinutes: typeof e.timeLimitMinutes === "number" ? e.timeLimitMinutes : 0,
      passPercent: typeof e.passPercent === "number" ? e.passPercent : 0,
      domains: Array.isArray(e.domains) ? e.domains.filter(str) : [],
    };
  });
  return { exams };
}
