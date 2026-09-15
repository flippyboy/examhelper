import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import QuestionCard from "../components/QuestionCard";
import { loadExam } from "../lib/loadExams";
import { isCorrect } from "../lib/scoring";
import {
  finish,
  formatRemaining,
  goTo,
  hasAnswer,
  markSubmitted,
  remainingMs,
  setAnswer,
  toggleFlag,
  withChoiceOrder,
} from "../lib/session";
import { loadSession, saveSession } from "../lib/storage";
import type { Exam, Question, SessionState } from "../types/exam";

export default function Session() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [confirmFinish, setConfirmFinish] = useState(false);

  useEffect(() => {
    const stored = loadSession();
    if (!stored || stored.examId !== id) {
      setError("No session for this exam. Start one from the setup page.");
      return;
    }
    if (stored.finishedAt) {
      navigate(`/exam/${id}/results`, { replace: true });
      return;
    }
    setSession(stored);
    loadExam(id)
      .then(setExam)
      .catch((err: Error) => setError(err.message));
  }, [id, navigate]);

  useEffect(() => {
    if (!session?.endsAt || session.finishedAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [session?.endsAt, session?.finishedAt]);

  const remain = session ? remainingMs(session, now) : null;
  const timedOut = remain === 0;

  useEffect(() => {
    if (!session || !timedOut || session.finishedAt) return;
    const done = finish(session);
    saveSession(done);
    navigate(`/exam/${id}/results`);
  }, [timedOut, session, id, navigate]);

  const question = useMemo(() => {
    if (!exam || !session) return null;
    const qid = session.questionIds[session.currentIndex];
    const raw = exam.questions.find((q) => q.id === qid);
    if (!raw) return null;
    return withChoiceOrder(raw, session.choiceOrder?.[qid]);
  }, [exam, session]);

  function persist(next: SessionState) {
    setSession(next);
    saveSession(next);
  }

  function complete() {
    if (!session) return;
    const done = finish(session);
    saveSession(done);
    navigate(`/exam/${id}/results`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!question || !session || !exam) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const locked = Boolean(session.submitted[question.id]);
      const choices = question.choices ?? [];
      const num = e.key >= "1" && e.key <= "9" ? Number(e.key) - 1 : "abcd".indexOf(e.key.toLowerCase());
      if (num >= 0 && num < choices.length && !locked) {
        e.preventDefault();
        const choice = choices[num];
        if (question.type === "multi") {
          const current = session.answers[question.id] ?? [];
          const selected = new Set(current);
          if (selected.has(choice.id)) selected.delete(choice.id);
          else if (selected.size < (question.selectCount ?? selected.size + 1)) selected.add(choice.id);
          persist(setAnswer(session, question.id, [...selected]));
        } else {
          persist(setAnswer(session, question.id, [choice.id]));
        }
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        persist(toggleFlag(session, question.id));
      }
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "n") {
        persist(goTo(session, session.currentIndex + 1));
      }
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "p") {
        persist(goTo(session, session.currentIndex - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, session, exam]);

  if (error) {
    return (
      <p className="error">
        {error} <Link to={`/exam/${id}`}>Back to setup</Link>
      </p>
    );
  }
  if (!exam || !session || !question) return <p className="muted">Loading session…</p>;

  const domainName = exam.domains.find((d) => d.id === question.domain)?.name ?? question.domain;
  const practice = session.config.mode === "practice";
  const locked = Boolean(session.submitted[question.id]);
  const reveal = practice && locked;
  const value = session.answers[question.id] ?? [];
  const unanswered = session.questionIds.filter((qid) => !hasAnswer(session, qid)).length;
  const last = session.currentIndex === session.questionIds.length - 1;

  function canSubmit(q: Question, given: string[]): boolean {
    if (q.type === "fill") return (given[0] ?? "").trim().length > 0;
    if (q.type === "multi") return given.length === (q.selectCount ?? given.length);
    return given.length === 1;
  }

  return (
    <>
      <div className="session-head">
        <div>
          <p className="kicker">
            {practice ? "Practice" : "Exam"}
            {session.config.timed ? " · timed" : ""}
          </p>
          <h1 style={{ fontSize: "1.35rem" }}>{exam.title}</h1>
        </div>
        {remain !== null ? (
          <div className={`timer ${remain < 60_000 ? "warn" : ""}`} aria-live="polite">
            {formatRemaining(remain)}
          </div>
        ) : null}
      </div>
      <div className="session-layout">
        <nav className="card" aria-label="Question list">
          <p className="muted" style={{ marginTop: 0 }}>
            {session.currentIndex + 1} / {session.questionIds.length}
          </p>
          <button className="btn secondary" type="button" onClick={() => setConfirmFinish(true)}>
            Finish
          </button>
          <div className="qnav" style={{ marginTop: "0.75rem" }}>
            {session.questionIds.map((qid, i) => {
              const q = exam.questions.find((item) => item.id === qid);
              const answered = hasAnswer(session, qid);
              let cls = "";
              if (i === session.currentIndex) cls += " current";
              if (answered) cls += " answered";
              if (session.flagged.includes(qid)) cls += " flagged";
              if (practice && session.submitted[qid] && q) {
                cls += isCorrect(q, session.answers[qid]) ? " right" : " wrong";
              }
              return (
                <button
                  key={qid}
                  type="button"
                  className={cls}
                  onClick={() => persist(goTo(session, i))}
                  aria-label={`Question ${i + 1}`}
                >
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
            locked={locked}
            reveal={reveal}
            onChange={(next) => persist(setAnswer(session, question.id, next))}
          />
          {reveal ? (
            <div className={`callout ${isCorrect(question, value) ? "ok" : "bad"}`}>
              <strong>{isCorrect(question, value) ? "Correct." : "Incorrect."}</strong> {question.explanation}
            </div>
          ) : null}
          <div className="footer-nav">
            <button
              className="btn ghost"
              type="button"
              onClick={() => persist(goTo(session, session.currentIndex - 1))}
              disabled={session.currentIndex === 0}
            >
              Previous
            </button>
            <div className="row">
              <button
                className={`btn ghost${session.flagged.includes(question.id) ? " secondary" : ""}`}
                type="button"
                onClick={() => persist(toggleFlag(session, question.id))}
              >
                {session.flagged.includes(question.id) ? "Flagged" : "Flag"}
              </button>
              {practice && !locked ? (
                <button
                  className="btn"
                  type="button"
                  disabled={!canSubmit(question, value)}
                  onClick={() => persist(markSubmitted(session, question.id))}
                >
                  Check
                </button>
              ) : last ? (
                <button className="btn" type="button" onClick={() => setConfirmFinish(true)}>
                  Finish
                </button>
              ) : (
                <button
                  className="btn"
                  type="button"
                  onClick={() => persist(goTo(session, session.currentIndex + 1))}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
      {confirmFinish ? (
        <div className="card" style={{ marginTop: "1rem" }}>
          <p>
            Submit this attempt
            {unanswered > 0 ? ` with ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}` : ""}?
          </p>
          <div className="row">
            <button className="btn" type="button" onClick={complete}>
              Submit
            </button>
            <button className="btn ghost" type="button" onClick={() => setConfirmFinish(false)}>
              Keep working
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
