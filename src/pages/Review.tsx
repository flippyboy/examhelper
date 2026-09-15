import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QuestionCard from "../components/QuestionCard";
import { loadExam } from "../lib/loadExams";
import { isCorrect } from "../lib/scoring";
import { loadSession } from "../lib/storage";
import type { Exam, SessionState } from "../types/exam";

export default function Review() {
  const { id = "" } = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadSession();
    if (!stored || stored.examId !== id || !stored.finishedAt) {
      setError("No finished session to review.");
      return;
    }
    setSession(stored);
    loadExam(id)
      .then(setExam)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  const question = useMemo(() => {
    if (!exam || !session) return null;
    const qid = session.questionIds[index];
    return exam.questions.find((q) => q.id === qid) ?? null;
  }, [exam, session, index]);

  if (error) {
    return (
      <p className="error">
        {error} <Link to={`/exam/${id}`}>Back</Link>
      </p>
    );
  }
  if (!exam || !session || !question) return <p className="muted">Loading review…</p>;

  const value = session.answers[question.id] ?? [];
  const ok = isCorrect(question, value);
  const domainName = exam.domains.find((d) => d.id === question.domain)?.name ?? question.domain;

  return (
    <>
      <p className="kicker">Review · {exam.title}</p>
      <h1 style={{ fontSize: "1.35rem" }}>
        Question {index + 1} of {session.questionIds.length}
      </h1>
      <div className="session-layout">
        <nav className="card">
          <div className="qnav">
            {session.questionIds.map((qid, i) => {
              const q = exam.questions.find((item) => item.id === qid);
              const right = q ? isCorrect(q, session.answers[qid]) : false;
              let cls = right ? " right" : " wrong";
              if (i === index) cls += " current";
              if (session.flagged.includes(qid)) cls += " flagged";
              return (
                <button key={qid} type="button" className={cls} onClick={() => setIndex(i)}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </nav>
        <section className="card">
          <QuestionCard
            question={question}
            domainName={domainName}
            value={value}
            locked
            reveal
            onChange={() => undefined}
          />
          <div className={`callout ${ok ? "ok" : "bad"}`}>
            <strong>{ok ? "Correct." : "Incorrect."}</strong> {question.explanation}
          </div>
          {question.references && question.references.length > 0 ? (
            <ul className="meta">
              {question.references.map((ref) => (
                <li key={ref.title}>
                  {ref.url ? (
                    <a href={ref.url} target="_blank" rel="noreferrer">
                      {ref.title}
                    </a>
                  ) : (
                    ref.title
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="footer-nav">
            <button className="btn ghost" type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              Previous
            </button>
            <div className="row">
              <Link className="btn secondary" to={`/exam/${id}/results`}>
                Results
              </Link>
              {index < session.questionIds.length - 1 ? (
                <button className="btn" type="button" onClick={() => setIndex(index + 1)}>
                  Next
                </button>
              ) : (
                <Link className="btn" to={`/exam/${id}`}>
                  New attempt
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
