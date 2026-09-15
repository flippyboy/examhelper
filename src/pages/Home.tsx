import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadCatalog } from "../lib/loadExams";
import type { CatalogEntry } from "../types/exam";

export default function Home() {
  const [exams, setExams] = useState<CatalogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog()
      .then((c) => setExams(c.exams))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!exams) return <p className="muted">Loading exams…</p>;

  return (
    <>
      <p className="kicker">Unofficial practice</p>
      <h1>Choose an exam</h1>
      <p className="lede">
        Each certification is a JSON pack under <code>exams/</code>. Scores stay in this browser.
        Add a pack and it appears here — no rebuild required if the folder is mounted.
      </p>
      {exams.length === 0 ? (
        <p className="card">No exams in the catalog yet. Drop a pack in <code>public/exams/</code>.</p>
      ) : (
        <div className="grid">
          {exams.map((exam) => (
            <Link className="card card-link" key={exam.id} to={`/exam/${exam.id}`}>
              <span className="badge">{exam.vendor}</span>
              <h2 style={{ marginTop: "0.65rem" }}>{exam.title}</h2>
              <ul className="meta">
                <li>{exam.questionCount} questions</li>
                <li>{exam.timeLimitMinutes} min</li>
                <li>Pass {exam.passPercent}%</li>
              </ul>
              <p className="muted" style={{ margin: "0.7rem 0 0" }}>
                {exam.domains.join(" · ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
