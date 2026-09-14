import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "../store/editor";
import { CAT, LIB } from "../lib/engine";
import { addNode, resolveGraph } from "../lib/graphOps";

interface Item {
  type: string;
  label: string;
  group: string;
}

/** Add-node search, opened with Tab or the + button. */
export function Palette() {
  const open = useEditor((s) => s.ui.paletteOpen);
  const at = useEditor((s) => s.ui.paletteAt);
  const setUi = useEditor((s) => s.setUi);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const [type, spec] of Object.entries(CAT))
      out.push({ type, label: spec.label, group: spec.cat });
    for (const [type, lib] of Object.entries(LIB))
      out.push({
        type,
        label: lib.label,
        group: lib.core ? "core function" : "project function",
      });
    return out;
  }, [open]);

  const shown = items.filter((i) =>
    (i.type + " " + i.label + " " + i.group)
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const add = (type: string) => {
    const st = useEditor.getState();
    let nid = "";
    st.commit((d) => {
      const g = resolveGraph(d, st.graphPath, true);
      if (g) nid = addNode(g, type, [Math.round(at[0]), Math.round(at[1])]);
    });
    setUi({ paletteOpen: false });
    if (nid) st.select({ kind: "node", id: nid });
  };

  return (
    <div
      className="palette-backdrop"
      onMouseDown={() => setUi({ paletteOpen: false })}
    >
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          placeholder="add node…  (type to search, Enter to add)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && shown[0]) add(shown[0].type);
            if (e.key === "Escape") setUi({ paletteOpen: false });
          }}
        />
        <div className="palette-list">
          {[
            "geo",
            "field",
            "mark",
            "util",
            "cop",
            "core function",
            "project function",
          ].map((g) => {
            const rows = shown.filter((i) => i.group === g);
            if (!rows.length) return null;
            return (
              <div key={g}>
                <div className="palette-group">{g}</div>
                {rows.map((i) => (
                  <button
                    key={i.type}
                    className={`palette-item cat-${g}`}
                    onClick={() => add(i.type)}
                  >
                    <b>{i.type}</b> <span>{i.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
