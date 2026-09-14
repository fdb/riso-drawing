import { useEffect, useRef, useState } from "react";

export type DragPhase = "start" | "move" | "end";

/** the number of decimals a value needs to show a step (0.05 → 2) */
const decimalsOf = (step: number) =>
  Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
export const fmt = (v: number, step = 0.01) => v.toFixed(decimalsOf(step));

/**
 * A draggable number. Press and drag horizontally to change the value, one step per pixel
 * (Shift ×10, Alt ×0.1). Click without dragging to type a value: Enter and blur commit,
 * Escape cancels. Arrow keys nudge by one step (Shift ×10, Alt ×0.1).
 *
 * A drag reports `onDrag(v, "start" | "move" | "end")` when given, so the caller can make the
 * whole drag one undo step; typed and nudged values go through `onChange`.
 */
export function NumberField({
  value,
  min,
  max,
  step = 0.01,
  onChange,
  onDrag,
  title,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  onDrag?: (v: number, phase: DragPhase) => void;
  title?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{
    id: number;
    lastX: number;
    acc: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    if (text !== null) inputRef.current?.select();
  }, [text !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const clamp = (v: number) => {
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };
  const snap = (v: number, quantum: number) =>
    Number((Math.round(v / quantum) * quantum).toFixed(6));
  const multOf = (e: { shiftKey: boolean; altKey: boolean }) =>
    e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
  const emit = (v: number, phase: DragPhase) =>
    onDrag ? onDrag(v, phase) : onChange(v);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: e.pointerId,
      lastX: e.clientX,
      acc: value,
      moved: false,
    };
    document.body.classList.add("dragging");
    onDrag?.(value, "start");
  };
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    e.preventDefault();
    if (!d.moved && Math.abs(e.clientX - d.lastX) < 3) return;
    d.moved = true;
    const dx = e.clientX - d.lastX;
    d.lastX = e.clientX;
    const mult = multOf(e);
    d.acc = clamp(d.acc + dx * step * mult);
    emit(snap(d.acc, mult < 1 ? step * mult : step), "move");
  };
  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    document.body.classList.remove("dragging");
    onDrag?.(value, "end");
    if (!d.moved) setText(String(value));
  };

  const commitText = () => {
    if (text === null) return;
    const v = Number(text.trim());
    if (text.trim() !== "" && Number.isFinite(v) && v !== value)
      onChange(clamp(v));
    setText(null);
  };
  const nudge = (e: React.KeyboardEvent, dir: 1 | -1) => {
    e.preventDefault();
    const mult = multOf(e);
    const base = text !== null ? Number(text) : value;
    const from = Number.isFinite(base) ? base : value;
    const q = mult < 1 ? step * mult : step;
    const v = clamp(snap(from + dir * step * mult, q));
    if (text !== null) setText(String(v));
    onChange(v);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") nudge(e, 1);
    else if (e.key === "ArrowDown") nudge(e, -1);
    else if (text !== null) {
      if (e.key === "Enter") commitText();
      else if (e.key === "Escape") setText(null);
    } else if (e.key === "Enter") setText(String(value));
  };

  if (text !== null)
    return (
      <input
        ref={inputRef}
        className="num edit"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={onKey}
        spellCheck={false}
      />
    );
  return (
    <span
      className="num"
      tabIndex={0}
      title={title}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKey}
    >
      <span className="val">{fmt(value, step)}</span>
    </span>
  );
}
