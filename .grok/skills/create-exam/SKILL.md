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
   tokens; stems that leak the answer (key text, a `such as`/`e.g.` example of
   the key, or a parenthetical alias of the fill token); guessable patterns
   (see Question bar): "all/none of the above", a key visibly longer or more
   detailed than its distractors, `NOT`/`EXCEPT` stems, `truefalse` on anything
   with nuance; stems with a second defensible answer or vague qualifiers;
   explanations that state the key without saying why each distractor is wrong.
   Distractors pass only if they look like a nearby command, CRD, flag, UI path,
   or sibling objective from the same product.
8. **Report** to the user: blueprint URL, domain coverage (domain → objective → question
   ids), question counts by type, review outcome, and that the pack is unofficial
   practice.

## Question bar

- Test one fact or decision from the objective; no trick double-negatives.
- The stem must not leak the answer: no key text, no `such as` / `e.g.` worked
  example of the key, no parenthetical alias of the token to type.
- Exactly one defensibly correct answer. If you need a paragraph to argue why
  the key is "more correct" than another choice, rewrite the item. No vague
  qualifiers (`sometimes`, `usually`), no jargon absent from the cited docs.
- Prefer scenarios over recall. Put the candidate in a situation ("a pod is
  stuck in `Pending` after…; what do you check first?") rather than asking
  them to recite a list. Scenario items should be the majority of the pack.
- Wrong choices must be reasonable: a nearby command, similar CRD/kind, sibling
  UI path, or off-by-one flag from the same docs — the mix-up a practitioner
  might actually make. Not jokes, unrelated products, or throwaway fillers.
  Best distractors encode a real misconception (wrong scope, wrong layer,
  wrong default, a deprecated form still in circulation).
- Do not make items guessable without knowledge:
  - No "all of the above" / "none of the above". If one slips in, it must
    sometimes be wrong.
  - Keep every choice at the same length and level of detail; the key must not
    be the longest or most specific option.
  - Shuffle `choices[]` so the key is not always first. The app also randomizes
    order per session (except `truefalse`).
  - No negative stems (`NOT`, `EXCEPT`, `least`). Reframe as a positive
    scenario asking which action/setting applies.
  - `truefalse` only for genuinely clear-cut facts (defaults, port numbers,
    hard limits). Anything needing judgment becomes `single`/`multi`.
- `explanation` must say why the key is right **and** why each distractor is
  wrong, naming the misconception behind it. "Correct: X, because Y" beats a
  restated answer.
- `fill` answers are short tokens (port numbers, command names, reserved words), with
  common variants listed in `answer`.
- Never paste vendor exam item text, even "from memory."
- Prefer surplus unique questions over a short pack.
