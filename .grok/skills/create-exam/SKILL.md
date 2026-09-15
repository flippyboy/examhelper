---
name: create-exam
description: >
  Scrape official IT certification exam objectives and public vendor docs,
  then write an original ExamHelper practice pack (catalog + exam.json).
  Use when the user wants a new practice exam, exam body, exam pack, or
  blueprint scrape for a named cert (AZ-104, AWS SAA, VCP, CompTIA, Cisco,
  VCF, etc.), or runs /create-exam.
---

# /create-exam — author an ExamHelper pack

Write original practice questions from **official published objectives**. Do not
copy vendor exam items or dump sites.

Pack format lives in `public/exams/schema.json`. Vendor URL patterns live in
`references/vendor-sources.md`. Do not restate either here.

## Inputs

Need an exam identity: vendor + exam name or code (e.g. `AZ-104`, `VCP-DCV 2024`).
If missing, ask once. Optional: question count (default 50), domain subset, extra doc URLs.

Output path: `public/exams/<id>/exam.json` where `<id>` is kebab-case (`az-104`, `vcp-dcv-2024`).

## Procedure

1. **Resolve the official blueprint.** Search, then fetch the vendor exam page or PDF
   from `references/vendor-sources.md`. Prefer the vendor. If the page is a PDF, extract
   domains, objective IDs/text, weights, duration, and question count. Record the URL.
2. **Refuse dumps.** If search hits exam-dump / cheat / "actual questions" sites, ignore
   them. Continue only with vendor (or clearly official partner) material.
3. **Fetch supporting docs** for thin objectives (vendor learn/docs, RFCs, man pages).
   Use them for explanations and `references[]`, not as question banks.
4. **Draft the pack** as `unofficial: true`. Domain `weight` values must sum to 100.
   Cover every listed objective at least once when count allows; otherwise sample
   proportionally to weights. Mix `single`, `multi`, `truefalse`, and `fill`.
   Every question needs `explanation` and at least one public `references[]` entry.
   `multi.selectCount` equals `answer.length` and is less than the number of choices.
5. **Write files.** Create `public/exams/<id>/exam.json`. Upsert the object in
   `public/exams/catalog.json` (`path` must be `<id>/exam.json`; `questionCount`,
   `domains` names, `timeLimitMinutes`, `passPercent`, `title`, `vendor`, `version`
   must match the pack).
6. **Validate.** Run `node scripts/validate-exam.mjs` (or
   `docker run --rm -v "$PWD":/app -w /app node:22-alpine node scripts/validate-exam.mjs`
   if Node is not on the host). Fix until it prints `ok`.
7. **Report** to the user: blueprint URL, domain coverage (domain → objective → question
   ids), question counts by type, and that the pack is unofficial practice.

## Question bar

- Test one fact or decision from the objective; no trick double-negatives.
- Wrong choices must be plausible for someone who mixed adjacent objectives.
- `fill` answers are short tokens (port numbers, command names, reserved words), with
  common variants listed in `answer`.
- Never paste vendor exam item text, even "from memory."
