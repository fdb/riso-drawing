import { Plus, Copy, Trash2 } from "lucide-react";
import { useEditor } from "../store/editor";

/** The project's scenes. `main` is the composition; the others are worlds it shows. */
export function ProjectPanel() {
  const scenes = useEditor((s) => s.doc.scenes);
  const current = useEditor((s) => s.sceneName);
  const openScene = useEditor((s) => s.openScene);
  const addScene = useEditor((s) => s.addScene);
  const removeScene = useEditor((s) => s.removeScene);
  const names = Object.keys(scenes).sort((a, b) =>
    a === "main" ? -1 : b === "main" ? 1 : a.localeCompare(b),
  );

  const add = (from?: string) => {
    const name = prompt(
      from ? `Duplicate "${from}" as:` : "New scene name:",
      from ? from + "-copy" : "scene",
    );
    if (name) addScene(name, from);
  };

  return (
    <div className="project">
      <div className="project-head">
        <b>Project</b>
        <button
          className="ghost"
          title="New scene"
          onClick={() => add()}
          aria-label="new scene"
        >
          <Plus size={14} />
        </button>
      </div>
      <ul className="scene-list">
        {names.map((n) => (
          <li
            key={n}
            className={n === current ? "on" : ""}
            onClick={() => openScene(n)}
            data-testid={`scene-${n}`}
          >
            <span className="scene-name">{n}</span>
            {n === "main" && <span className="note">composition</span>}
            <span className="scene-tools">
              <button
                className="ghost"
                title="Duplicate"
                onClick={(e) => {
                  e.stopPropagation();
                  add(n);
                }}
                aria-label={`duplicate ${n}`}
              >
                <Copy size={12} />
              </button>
              {names.length > 1 && (
                <button
                  className="ghost"
                  title="Delete scene"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete scene "${n}"?`)) removeScene(n);
                  }}
                  aria-label={`delete ${n}`}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
