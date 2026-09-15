import type { DomainScore } from "../types/exam";

export default function DomainBars({ scores }: { scores: DomainScore[] }) {
  return (
    <div>
      {scores.map((d) => {
        const pct = d.total === 0 ? 0 : Math.round((d.correct / d.total) * 100);
        return (
          <div key={d.id} style={{ marginBottom: "0.85rem" }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <span>{d.name}</span>
              <span className="muted">
                {d.correct}/{d.total} ({pct}%)
              </span>
            </div>
            <div className={`bar ${pct >= 70 ? "pass" : "fail"}`}>
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
