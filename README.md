# ExamHelper

Practice exams for IT certifications. Each exam is a JSON pack under `public/exams/`.
Scores stay in the browser. Packs are unofficial practice, not vendor items.

## Run

```bash
docker compose up --build
```

Open http://localhost:8080

To add packs without rebuilding the image, keep the compose volume:

```yaml
volumes:
  - ./public/exams:/usr/share/nginx/html/exams:ro
```

Drop `public/exams/<id>/exam.json` and list it in `public/exams/catalog.json`.
Validate with:

```bash
docker run --rm -v "$PWD":/app -w /app node:22-alpine node scripts/validate-exam.mjs
```

## Author a real cert pack

In Grok, run `/create-exam` (or ask to scrape objectives and write a pack) with the
exam code. The skill fetches the official blueprint, writes original questions, and
validates them against `public/exams/schema.json`.

## Layout

```
public/exams/schema.json          pack contract
public/exams/catalog.json         list shown on the home page
public/exams/<id>/exam.json       one exam
.grok/skills/create-exam/         authoring skill
```
