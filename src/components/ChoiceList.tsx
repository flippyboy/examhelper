import type { Question } from "../types/exam";
import Markdown from "./Markdown";

const KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"];

interface Props {
  question: Question;
  value: string[];
  disabled: boolean;
  reveal: boolean;
  onChange: (next: string[]) => void;
}

export default function ChoiceList({ question, value, disabled, reveal, onChange }: Props) {
  const choices = question.choices ?? [];
  const correct = new Set(question.answer);

  function pick(id: string) {
    if (disabled) return;
    if (question.type === "multi") {
      const selected = new Set(value);
      if (selected.has(id)) selected.delete(id);
      else if (selected.size < (question.selectCount ?? selected.size + 1)) selected.add(id);
      onChange([...selected]);
      return;
    }
    onChange([id]);
  }

  return (
    <div>
      {question.type === "multi" ? (
        <p className="muted">Select {question.selectCount}.</p>
      ) : null}
      {choices.map((choice, i) => {
        const selected = value.includes(choice.id);
        const isRight = correct.has(choice.id);
        let cls = "choice";
        if (selected) cls += " selected";
        if (reveal && isRight) cls += " correct";
        if (reveal && selected && !isRight) cls += " incorrect";
        return (
          <button
            key={choice.id}
            type="button"
            className={cls}
            disabled={disabled}
            onClick={() => pick(choice.id)}
          >
            <span className="key">{KEYS[i] ?? i + 1}</span>
            <Markdown className="choice-text" source={choice.text} />
          </button>
        );
      })}
    </div>
  );
}
