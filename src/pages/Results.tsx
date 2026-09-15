import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DomainBars from "../components/DomainBars";
import { loadExam } from "../lib/loadExams";
import { scoreSession } from "../lib/scoring";
import { appendHistory, loadHistory, loadSession } from "../lib/storage";
import type { Exam, HistoryEntry, SessionState } from "../types/exam";

export default function Results() {
  const { id = "" } = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadSession();
    if (!stored || stored.examId !== id || !stored.finishedAt) {
      setError("No finished session to score.");
      return;
    }
    setSession(stored);
    loadExam(id)
      .then((loaded) => {
        setExam(loaded);
        const result = scoreSession(loaded, stored);
        const existing = loadHistory(loaded.id);
        const already = existing.some((h) => h.date === stored.finishedAt);
        const entry: HistoryEntry = {
          date: stored.finishedAt ?? Date.now(),
          mode: stored.config.mode,
          timed: stored.config.timed,
          scorePercent: result.percent,
          passed: result.passed,
          correct: result.correct,
          total: result.total,
          domainScores: result.domainScores,
        };
        setHistory(already ? existing : appendHistory(loaded.id, entry));
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <p className="error">
        {error} <Link to={`/exam/${id}`}>Start a session</Link>
      </p>
    );
  }
  if (!exam || !session) return <p className="muted">Scoring…</p>;

  const result = scoreSession(exam, session);

  return (
    <>
      <p className="kicker">{exam.title}</p>
      <h1>Results</h1>
      <div className="card score-hero">
        <div>
          <p className="muted" style={{ margin: 0 }}>
            {result.correct} / {result.total} correct
          </p>
          <strong>{result.percent}%</strong>
        </div>
        <div>
          <span className={`badge ${result.passed ? "" : "amber"}`}>
            {result.passed ? "Pass" : "Fail"} · {exam.passPercent}% required
          </span>
          <p className="muted">
            {session.config.mode}
            {session.config.timed ? " · timed" : " · untimed"}
          </p>
        </div>
      </div>
      <section className="card" style={{ marginBottom: "1rem" }}>
        <h2>By domain</h2>
        <DomainBars scores={result.domainScores} />
      </section>
      <div className="row" style={{ marginBottom: "1.5rem" }}>
        <Link className="btn" to={`/exam/${id}/review`}>
          Review answers
        </Link>
        <Link className="btn secondary" to={`/exam/${id}`}>
          New attempt
        </Link>
        <Link className="btn ghost" to="/">
          All exams
        </Link>
      </div>
      {history.length > 0 ? (
        <section>
          <h2>History on this device</h2>
          <ul className="history">
            {history.map((h) => (
              <li key={h.date}>
                <span>
                  {new Date(h.date).toLocaleString()} · {h.mode}
                </span>
                <strong>
                  {h.scorePercent}% {h.passed ? "pass" : "fail"}
                </strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
