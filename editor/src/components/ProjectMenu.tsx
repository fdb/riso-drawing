import { useEffect } from "react";
import { FolderOpen, FolderPlus, Save, X } from "lucide-react";
import { useEditor, type SaveStatus } from "../store/editor";
import { supportsFolders } from "../lib/projectFs";
import "./ProjectMenu.css";

const LABEL: Record<SaveStatus, string> = {
  memory: "not on disk",
  permission: "access needed",
  saved: "saved",
  saving: "saving…",
  unsaved: "unsaved",
  error: "save failed",
};

/** The project folder: which one is open, whether it is saved, open / new / close. */
export function ProjectMenu() {
  const project = useEditor((s) => s.project);
  const openFolder = useEditor((s) => s.openFolder);
  const newProject = useEditor((s) => s.newProject);
  const saveNow = useEditor((s) => s.saveNow);
  const grantAccess = useEditor((s) => s.grantAccess);
  const closeFolder = useEditor((s) => s.closeFolder);
  const restoreProject = useEditor((s) => s.restoreProject);
  const supported = supportsFolders();

  useEffect(() => {
    if (supported) void restoreProject();
  }, [supported, restoreProject]);

  const { status, name, dir, error } = project;
  return (
    <div className="project-menu" data-testid="project-menu">
      <div className="pm-row">
        <span className="pm-name" title={dir ? `folder: ${dir.name}` : ""}>
          {name}
        </span>
        <span
          className={`pm-status ${status}`}
          data-testid="save-status"
          title={
            status === "memory"
              ? "kept in this browser's localStorage"
              : `folder: ${dir?.name}`
          }
        >
          {LABEL[status]}
        </span>
      </div>
      <div className="pm-actions">
        {status === "permission" ? (
          <button className="pm-grant" onClick={() => void grantAccess()}>
            <FolderOpen size={13} /> Grant access to "{dir?.name}"
          </button>
        ) : (
          <>
            <button
              disabled={!supported}
              title="Open a project folder"
              onClick={() => void openFolder()}
            >
              <FolderOpen size={13} /> Open…
            </button>
            <button
              disabled={!supported}
              title="Start a project in an empty folder from the built-in film"
              onClick={() => void newProject("film")}
            >
              <FolderPlus size={13} /> New from film…
            </button>
            <button
              disabled={!supported}
              title="Start an empty project in an empty folder"
              onClick={() => void newProject("empty")}
            >
              <FolderPlus size={13} /> New empty…
            </button>
          </>
        )}
        {(status === "unsaved" || status === "error") && (
          <button title="Save now" onClick={() => void saveNow()}>
            <Save size={13} /> Save
          </button>
        )}
        {dir && (
          <button
            className="ghost"
            title="Close the folder; the document stays in memory"
            aria-label="close folder"
            onClick={() => void closeFolder()}
          >
            <X size={13} />
          </button>
        )}
      </div>
      {!supported && (
        <p className="note pm-note" data-testid="folders-unsupported">
          This browser cannot open folders (Chrome and Edge can). Use export /
          import JSON in the toolbar.
        </p>
      )}
      {error && (
        <p className="note pm-error" data-testid="project-error">
          {error}
        </p>
      )}
    </div>
  );
}
