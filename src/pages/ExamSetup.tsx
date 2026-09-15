import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { loadExam } from "../lib/loadExams";
import { buildSession } from "../lib/session";
import { loadHistory, resumableSession, saveSession } from "../lib/storage";
import type { Exam, HistoryEntry, SessionMode } from "../types/exam";

export default function ExamSetup() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<SessionMode>("practice");
  const [timed, setTimed] = useState(false);
  const [domainIds, setDomainIds] = useState<string[]>([]);
  const [limitAll, setLimitAll] = useState(true);
  const [limit, setLimit] = useState(10);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const resume = resumableSession(id);

  useEffect(() => {
    loadExam(id)
      .then((loaded) => {
        setExam(loaded);
        setDomainIds(loaded.domains.map((d) => d.id));
        setHistory(loadHistory(loaded.id));
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  const available = useMemo(() => {
    if (!exam) return 0;
    const allow = new Set(domainIds);
    return exam.questions.filter((q) => allow.has(q.domain)).length;
  }, [exam, domainIds]);

  if (error) return <p className="error">{error}</p>;
  if (!exam) return <p className="muted">Loading exam…</p>;

  function toggleDomain(domainId: string) {
    setDomainIds((current) =>
      current.includes(domainId) ? current.filter((d) => d !== domainId) : [...current, domainId],
    );
  }

  function start() {
    if (!exam || available === 0) return;
    const session = buildSession(exam, {
      examId: exam.id,
      mode,
      timed,
      domainIds,
      questionLimit: limitAll ? null : Math.min(limit, available),
    });
    saveSession(session);
    navigate(`/exam/${exam.id}/session`);
  }

  return (
    <div className="setup">
      <section>
        <p className="kicker">{exam.vendor}{exam.code ? ` · ${exam.code}` : ""}</p>
        <h1>{exam.title}</h1>
        <p className="lede">{exam.description}</p>
        <p>
          <span className="badge amber">Unofficial practice</span>
        </p>
        <ul className="meta">
          <li>{exam.questions.length} questions</li>
          <li>{exam.timeLimitMinutes} min timed</li>
          <li>Pass {exam.passPercent}%</li>
        </ul>
        {resume ? (
          <p className="callout info">
            A session is in progress ({resume.currentIndex + 1}/{resume.questionIds.length}).{" "}
            <Link to={`/exam/${exam.id}/session`}>Resume</Link>
          </p>
        ) : null}
        {history.length > 0 ? (
          <div style={{ marginTop: "1.5rem" }}>
            <h2>Recent attempts</h2>
            <ul className="history">
              {history.slice(0, 5).map((h) => (
                <li key={h.date}>
                  <span>
                    {new Date(h.date).toLocaleString()} · {h.mode}
                    {h.timed ? " · timed" : ""}
                  </span>
                  <strong>
                    {h.scorePercent}% {h.passed ? "pass" : "fail"}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
      >
        <fieldset>
          <legend>Mode</legend>
          <label className="option">
            <input
              type="radio"
              name="mode"
              checked={mode === "practice"}
              onChange={() => {
                setMode("practice");
                setTimed(false);
              }}
            />
            <span>
              Practice — feedback after each question
            </span>
          </label>
          <label className="option">
            <input
              type="radio"
              name="mode"
              checked={mode === "exam"}
              onChange={() => {
                setMode("exam");
                setTimed(true);
              }}
            />
            <span>Exam — no feedback until the end</span>
          </label>
        </fieldset>
        <fieldset>
          <legend>Timer</legend>
          <label className="option">
            <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
            <span>Timed ({exam.timeLimitMinutes} minutes)</span>
          </label>
        </fieldset>
        <fieldset>
          <legend>Domains</legend>
          {exam.domains.map((d) => (
            <label className="option" key={d.id}>
              <input
                type="checkbox"
                checked={domainIds.includes(d.id)}
                onChange={() => toggleDomain(d.id)}
              />
              <span>
                {d.name} ({d.weight}%)
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Length</legend>
          <label className="option">
            <input type="radio" name="len" checked={limitAll} onChange={() => setLimitAll(true)} />
            <span>All {available} matching questions</span>
          </label>
          <label className="option">
            <input type="radio" name="len" checked={!limitAll} onChange={() => setLimitAll(false)} />
            <span>
              Random{" "}
              <input
                type="number"
                min={1}
                max={Math.max(1, available)}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                disabled={limitAll}
              />
            </span>
          </label>
        </fieldset>
        <button className="btn" type="submit" disabled={available === 0}>
          Start
        </button>
      </form>
    </div>
  );
}
