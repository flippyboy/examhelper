#!/usr/bin/env node
/**
 * Validate public/exams/catalog.json against each pack and the pack rules
 * described by public/exams/schema.json.
 *
 * Usage:
 *   node scripts/validate-exam.mjs
 *   node scripts/validate-exam.mjs public/exams/demo-it-foundations/exam.json
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMS = join(ROOT, "public", "exams");
const ID_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const TYPES = new Set(["single", "multi", "truefalse", "fill"]);

const errors = [];
function fail(msg) {
  errors.push(msg);
}

function loadJson(path) {
  if (!existsSync(path)) {
    fail(`missing file: ${path}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`invalid JSON ${path}: ${err.message}`);
    return null;
  }
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateQuestion(examId, q, domainIds, seenIds) {
  const loc = `${examId} question ${q?.id ?? "(missing id)"}`;
  if (!q || typeof q !== "object") {
    fail(`${examId}: question is not an object`);
    return;
  }
  for (const k of ["id", "type", "domain", "objective", "stem", "answer", "explanation"]) {
    if (k === "answer") {
      if (!Array.isArray(q.answer) || q.answer.length < 1) fail(`${loc}: answer must be a non-empty string array`);
    } else if (!isNonEmptyString(q[k])) {
      fail(`${loc}: missing ${k}`);
    }
  }
  if (q.id) {
    if (seenIds.has(q.id)) fail(`${examId}: duplicate question id ${q.id}`);
    seenIds.add(q.id);
  }
  if (!TYPES.has(q.type)) fail(`${loc}: unknown type ${q.type}`);
  if (q.domain && !domainIds.has(q.domain)) fail(`${loc}: domain ${q.domain} is not in domains[]`);
  if (q.references) {
    if (!Array.isArray(q.references)) fail(`${loc}: references must be an array`);
    else {
      for (const r of q.references) {
        if (!r || !isNonEmptyString(r.title)) fail(`${loc}: reference missing title`);
      }
    }
  }

  const choiceIds = new Set();
  if (q.type === "single" || q.type === "multi" || q.type === "truefalse") {
    if (!Array.isArray(q.choices) || q.choices.length < 2) fail(`${loc}: need at least 2 choices`);
    else {
      for (const c of q.choices) {
        if (!c || !isNonEmptyString(c.id) || !isNonEmptyString(c.text)) fail(`${loc}: invalid choice`);
        else if (choiceIds.has(c.id)) fail(`${loc}: duplicate choice id ${c.id}`);
        else choiceIds.add(c.id);
      }
    }
    if (q.type === "truefalse" && q.choices?.length !== 2) fail(`${loc}: truefalse needs exactly 2 choices`);
    if (q.type === "single" && q.answer?.length !== 1) fail(`${loc}: single answer must have 1 id`);
    if (q.type === "multi") {
      if (!Number.isInteger(q.selectCount) || q.selectCount < 2) fail(`${loc}: selectCount must be an integer >= 2`);
      if (q.answer?.length !== q.selectCount) fail(`${loc}: answer length must equal selectCount`);
      if (q.choices && q.selectCount >= q.choices.length) fail(`${loc}: selectCount must be < number of choices`);
    }
    if (Array.isArray(q.answer)) {
      for (const a of q.answer) {
        if (choiceIds.size && !choiceIds.has(a)) fail(`${loc}: answer id ${a} is not a choice`);
      }
    }
  }

  if (q.type === "fill") {
    if (q.choices) fail(`${loc}: fill questions must not have choices`);
    for (const a of q.answer ?? []) {
      if (!isNonEmptyString(a)) fail(`${loc}: fill answer values must be non-empty strings`);
    }
  }
}

function validateExam(exam, filePath) {
  if (!exam) return;
  const folder = basename(dirname(filePath));
  if (!isNonEmptyString(exam.id) || !ID_RE.test(exam.id)) fail(`${filePath}: invalid id`);
  if (exam.id && exam.id !== folder) fail(`${filePath}: id ${exam.id} must match folder ${folder}`);
  for (const k of ["title", "vendor", "version", "description"]) {
    if (!isNonEmptyString(exam[k])) fail(`${filePath}: missing ${k}`);
  }
  if (exam.unofficial !== true) fail(`${filePath}: unofficial must be true`);
  if (!Number.isInteger(exam.passPercent) || exam.passPercent < 1 || exam.passPercent > 100) {
    fail(`${filePath}: passPercent must be 1–100`);
  }
  if (!Number.isInteger(exam.timeLimitMinutes) || exam.timeLimitMinutes < 1) {
    fail(`${filePath}: timeLimitMinutes must be a positive integer`);
  }
  if (!Array.isArray(exam.domains) || exam.domains.length < 1) fail(`${filePath}: domains required`);
  const domainIds = new Set();
  let weightSum = 0;
  for (const d of exam.domains ?? []) {
    if (!d || !isNonEmptyString(d.id) || !isNonEmptyString(d.name) || typeof d.weight !== "number") {
      fail(`${filePath}: invalid domain`);
      continue;
    }
    if (domainIds.has(d.id)) fail(`${filePath}: duplicate domain id ${d.id}`);
    domainIds.add(d.id);
    weightSum += d.weight;
  }
  if (Math.abs(weightSum - 100) > 0.01) fail(`${filePath}: domain weights sum to ${weightSum}, expected 100`);
  if (!Array.isArray(exam.questions) || exam.questions.length < 1) fail(`${filePath}: questions required`);
  const seen = new Set();
  const usedDomains = new Set();
  for (const q of exam.questions ?? []) {
    validateQuestion(exam.id ?? filePath, q, domainIds, seen);
    if (q?.domain) usedDomains.add(q.domain);
  }
  for (const id of domainIds) {
    if (!usedDomains.has(id)) fail(`${filePath}: domain ${id} has no questions`);
  }
  return exam;
}

function validateCatalog(catalog, examsById) {
  if (!catalog || !Array.isArray(catalog.exams)) {
    fail("catalog.json must have an exams array");
    return;
  }
  const seen = new Set();
  for (const entry of catalog.exams) {
    if (!entry?.id || !entry.path) {
      fail("catalog entry missing id or path");
      continue;
    }
    if (seen.has(entry.id)) fail(`catalog duplicate id ${entry.id}`);
    seen.add(entry.id);
    const exam = examsById.get(entry.id);
    if (!exam) {
      fail(`catalog lists ${entry.id} but pack failed to load`);
      continue;
    }
    if (entry.title !== exam.title) fail(`catalog ${entry.id}: title mismatch`);
    if (entry.vendor !== exam.vendor) fail(`catalog ${entry.id}: vendor mismatch`);
    if (entry.version !== exam.version) fail(`catalog ${entry.id}: version mismatch`);
    if (entry.questionCount !== exam.questions.length) {
      fail(`catalog ${entry.id}: questionCount ${entry.questionCount} != ${exam.questions.length}`);
    }
    if (entry.timeLimitMinutes !== exam.timeLimitMinutes) fail(`catalog ${entry.id}: timeLimitMinutes mismatch`);
    if (entry.passPercent !== exam.passPercent) fail(`catalog ${entry.id}: passPercent mismatch`);
    const names = exam.domains.map((d) => d.name);
    const listed = entry.domains ?? [];
    if (names.join("|") !== listed.join("|")) {
      fail(`catalog ${entry.id}: domains ${JSON.stringify(listed)} != ${JSON.stringify(names)}`);
    }
    if (entry.path !== `${entry.id}/exam.json`) {
      fail(`catalog ${entry.id}: path must be ${entry.id}/exam.json`);
    }
  }
  for (const id of examsById.keys()) {
    if (!seen.has(id)) fail(`pack ${id} exists but is not in catalog.json`);
  }
}

const args = process.argv.slice(2);
if (args.length === 1) {
  const path = resolve(args[0]);
  validateExam(loadJson(path), path);
} else {
  const catalog = loadJson(join(EXAMS, "catalog.json"));
  const examsById = new Map();
  for (const entry of catalog?.exams ?? []) {
    if (!entry?.path) continue;
    const path = join(EXAMS, entry.path);
    const exam = validateExam(loadJson(path), path);
    if (exam?.id) examsById.set(exam.id, exam);
  }
  validateCatalog(catalog, examsById);
}

if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`${errors.length} error(s)`);
  process.exit(1);
}
console.log("ok");
