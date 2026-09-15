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
If missing, ask once. Optional: question count, domain subset, extra doc URLs.
Default size is **80**. Prefer too many unique sourced items over too few; do not stop early
to hit a round number. If the user sets a count, treat it as a floor, not a cap.

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
   Cover every listed objective at least twice (more is better). Sample extra items
   proportionally to weights. Mix `single`, `multi`, `truefalse`, and `fill`.
   Every question needs `explanation` and at least one public `references[]` entry.
   `multi.selectCount` equals `answer.length` and is less than the number of choices.
   A large original bank beats a thin one; skip only if a remaining objective has no
   public fact left to test. Never pad with rewords of items already in the pack.
5. **Write files.** Create `public/exams/<id>/exam.json`. Upsert the object in
   `public/exams/catalog.json` (`path` must be `<id>/exam.json`; `questionCount`,
   `domains` names, `timeLimitMinutes`, `passPercent`, `title`, `vendor`, `version`
   must match the pack).
6. **Validate.** Run `node scripts/validate-exam.mjs` (or
   `docker run --rm -v "$PWD":/app -w /app node:22-alpine node scripts/validate-exam.mjs`
   if Node is not on the host). Fix until it prints `ok`.
7. **Review separately.** Do not grade the pack in the same pass that wrote it.
   Spawn a **general-purpose** subagent whose only job is to read the new
   `exam.json` (and the cited URLs as needed) and audit quality. The parent
   must not reuse drafting context as the review. The reviewer returns only:
   items to fix (id + problem), items that are fine, and a short distractor
   verdict. Apply the fixes in the parent, then re-run validate.
   Reviewer must flag: joke/impossible/`foo`/`bar` distractors; wrong choices
   a novice would dismiss on sight; keys that disagree with the explanation or
   cited doc; duplicate or reworded stems; `fill` answers that are not short
   tokens. Distractors pass only if they look like a nearby command, CRD, flag,
   UI path, or sibling objective from the same product.
8. **Report** to the user: blueprint URL, domain coverage (domain → objective → question
   ids), question counts by type, review outcome, and that the pack is unofficial
   practice.

## Question bar

- Test one fact or decision from the objective; no trick double-negatives.
- Wrong choices must be reasonable: a nearby command, similar CRD/kind, sibling
  UI path, or off-by-one flag from the same docs — the mix-up a practitioner
  might actually make. Not jokes, unrelated products, or throwaway fillers.
- `fill` answers are short tokens (port numbers, command names, reserved words), with
  common variants listed in `answer`.
- Never paste vendor exam item text, even "from memory."
- Prefer surplus unique questions over a short pack.
