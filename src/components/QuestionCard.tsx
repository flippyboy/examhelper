import type { Question } from "../types/exam";
import ChoiceList from "./ChoiceList";
import Markdown from "./Markdown";

interface Props {
  question: Question;
  domainName: string;
  value: string[];
  locked: boolean;
  reveal: boolean;
  onChange: (next: string[]) => void;
}

export default function QuestionCard({
  question,
  domainName,
  value,
  locked,
  reveal,
  onChange,
}: Props) {
  return (
    <>
      <p className="objective">
        {domainName} · {question.objective}
      </p>
      <div className="stem" role="heading" aria-level={2}>
        <Markdown source={question.stem} />
      </div>
      {question.type === "fill" ? (
        <>
          <input
            className="fill"
            value={value[0] ?? ""}
            disabled={locked}
            autoComplete="off"
            spellCheck={false}
            placeholder="Your answer"
            onChange={(e) => onChange([e.target.value])}
          />
          {reveal ? (
            <p className="muted">
              Accepted: {question.answer.map((a, i) => (
                <span key={a}>
                  {i > 0 ? " / " : null}
                  <code>{a}</code>
                </span>
              ))}
            </p>
          ) : null}
        </>
      ) : (
        <ChoiceList
          question={question}
          value={value}
          disabled={locked}
          reveal={reveal}
          onChange={onChange}
        />
      )}
    </>
  );
}
