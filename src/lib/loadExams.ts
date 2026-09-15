import type { Catalog, Exam } from "../types/exam";
import { validateCatalog, validateExam } from "./validate";

const examCache = new Map<string, Exam>();

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return res.json();
}

export async function loadCatalog(): Promise<Catalog> {
  return validateCatalog(await getJson("/exams/catalog.json"));
}

export async function loadExam(id: string): Promise<Exam> {
  const cached = examCache.get(id);
  if (cached) return cached;
  const catalog = await loadCatalog();
  const entry = catalog.exams.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown exam: ${id}`);
  const exam = validateExam(await getJson(`/exams/${entry.path}`));
  if (exam.id !== id) throw new Error(`Pack id ${exam.id} does not match ${id}`);
  examCache.set(id, exam);
  return exam;
}
