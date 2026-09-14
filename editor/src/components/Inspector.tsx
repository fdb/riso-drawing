import { useRef, useState } from "react";
import {
  Trash2,
  Copy,
  CornerRightDown,
  Target,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useEditor } from "../store/editor";
import {
  resolveGraph,
  removeNode,
  renameNode,
  duplicateNode,
  disconnect,
  moveInList,
} from "../lib/graphOps";
import {
  CAT,
  LIB,
  evalExpr,
  isSubnet,
  nodeLabel,
  bypassPortOf,
} from "../lib/engine";
import type {
  Doc,
  GraphDoc,
  GraphPathStep,
  NodeDoc,
  ParamSchema,
  ParamValue,
} from "../lib/types";
import { NumberField } from "./NumberField";

const DUMMY_CTX = {
  A: {},
  V: {},
  t: 0,
  u: 0,
  iris: 1,
  seed: 1,
  path: "",
  cell: { blue: 5.6, pink: 5.2, yellow: 6.2 },
  angle: { blue: 0.26, pink: 0.79, yellow: 0 },
};
/** One parameter: a draggable number, text for expressions, ƒ toggles between them. */
export function ParamRow({
  label,
  value,
  schema,
  onChange,
  expr = true,
  onDrag,
}: {
  label: string;
  value: ParamValue;
  schema?: ParamSchema;
  onChange: (v: ParamValue) => void;
  expr?: boolean;
  onDrag?: (v: number, phase: "start" | "move" | "end") => void;
}) {
  const kind = schema?.kind;
  const [text, setText] = useState<string | null>(null);
  if (kind === "ink" || kind === "mode") {
    const opts =
      kind === "ink"
        ? ["blue", "pink", "yellow", "all"]
        : ["add", "solid", "cut"];
    return (
      <div className="row">
        <label>{label}</label>
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }
  const isText = typeof value === "string" || kind === "text";
  const toggle = () => {
    if (typeof value === "string") {
      let v = Number(evalExpr(value, DUMMY_CTX));
      if (!Number.isFinite(v))
        v = typeof schema?.def === "number" ? schema.def : 0;
      onChange(Math.round(v * 1000) / 1000);
    } else onChange(String(value));
  };
  const isColor =
    kind === "color" &&
    typeof value === "string" &&
    /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className="row">
      <label title={label}>{label}</label>
      {isText ? (
        <span className={`field ${isColor ? "color" : ""}`}>
          {isColor && (
            <input
              type="color"
              value={value as string}
              onChange={(e) => onChange(e.target.value)}
              title="pick a colour"
            />
          )}
          <input
            className="text"
            value={text ?? String(value)}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              if (text !== null && text !== String(value)) onChange(text);
              setText(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setText(null);
            }}
            spellCheck={false}
          />
        </span>
      ) : (
        <NumberField
          value={Number(value)}
          min={schema?.min}
          max={schema?.max}
          step={schema?.step ?? 0.01}
          onChange={(v) => onChange(v)}
          onDrag={onDrag}
          title="drag to change · click to type · ↑↓ nudge (⇧ ×10, ⌥ ×0.1)"
        />
      )}
      {expr && kind !== "expr" && (
        <button
          className={`fx ${typeof value === "string" ? "on" : ""}`}
          onClick={toggle}
          title="toggle expression"
        >
          ƒ
        </button>
      )}
    </div>
  );
}

function useDragParam(apply: (doc: Doc, v: number) => void, key: string) {
  const s = useEditor.getState;
  const dragging = useRef(false);
  return (v: number, phase: "start" | "move" | "end") => {
    if (phase === "start") {
      dragging.current = true;
      s().beginDrag();
    } else if (phase === "move") {
      if (dragging.current) s().drag((d) => apply(d, v));
      else s().commit((d) => apply(d, v));
    } else {
      dragging.current = false;
      s().endDrag();
    }
    void key;
  };
}

export function NodeEditor({
  graph,
  id,
  node,
  root = false,
}: {
  graph: GraphDoc;
  id: string;
  node: NodeDoc;
  /** edit at the scene root regardless of where the graph view is */
  root?: boolean;
}) {
  const viewPath = useEditor((s) => s.graphPath);
  const sceneName = useEditor((s) => s.sceneName);
  const graphPath: GraphPathStep[] = root
    ? [{ kind: "scene", name: sceneName }]
    : viewPath;
  const commit = useEditor((s) => s.commit);
  const select = useEditor((s) => s.select);
  const dive = useEditor((s) => s.dive);
  const setPath = useEditor((s) => s.setPath);
  const [idText, setIdText] = useState<string | null>(null);
  const lib = LIB[node.type],
    spec = CAT[node.type];
  const schema = lib ? lib.params : (spec?.params ?? {});
  const edit = (fn: (n: NodeDoc, g: GraphDoc) => void) =>
    commit((d) => {
      const g = resolveGraph(d, graphPath, true);
      if (g?.nodes[id]) fn(g.nodes[id], g);
    });
  const dragParam = (k: string) => {
    const s = useEditor.getState;
    let dragging = false;
    return (v: number, phase: "start" | "move" | "end") => {
      const apply = (d: Doc) => {
        const g = resolveGraph(d, graphPath, true);
        if (g?.nodes[id]) (g.nodes[id].params ??= {})[k] = v;
      };
      if (phase === "start") {
        dragging = true;
        s().beginDrag();
      } else if (phase === "move") {
        if (s().dragBase) s().drag(apply);
        else s().commit(apply);
      } else {
        dragging = false;
        s().endDrag();
      }
      void dragging;
    };
  };

  return (
    <div className="inspector">
      <div className="insp-head">
        <input
          className="id"
          value={idText ?? id}
          onChange={(e) => setIdText(e.target.value)}
          onBlur={() => {
            if (idText && idText !== id) {
              let ok = false;
              commit((d) => {
                const g = resolveGraph(d, graphPath, true);
                if (g) ok = renameNode(g, id, idText);
              });
              if (ok) select({ kind: "node", id: idText.trim() });
            }
            setIdText(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <span className={`badge cat-${lib ? "subnet" : spec?.cat}`}>
          {nodeLabel(node.type)}
        </span>
      </div>
      <div className="btns">
        <label className="chk">
          <input
            type="checkbox"
            checked={node.enabled !== false}
            onChange={(e) =>
              edit((n) => {
                n.enabled = e.target.checked;
              })
            }
          />{" "}
          enabled
        </label>
        {bypassPortOf(node.type) && (
          <label className="chk">
            <input
              type="checkbox"
              checked={!!node.bypass}
              onChange={(e) =>
                edit((n) => {
                  n.bypass = e.target.checked || undefined;
                })
              }
            />{" "}
            bypass
          </label>
        )}
        {graph.output !== id && (
          <button
            onClick={() =>
              edit((_, g) => {
                g.output = id;
              })
            }
            title="Make this node the graph output"
          >
            <Target size={13} /> output
          </button>
        )}
        {isSubnet(node.type) && (
          <button
            onClick={() => dive({ kind: "lib", type: node.type, via: id })}
          >
            <CornerRightDown size={13} /> open subnet
          </button>
        )}
        {node.template && (
          <button onClick={() => dive({ kind: "template", node: id })}>
            <CornerRightDown size={13} /> open template
          </button>
        )}
        <button
          onClick={() => {
            let nid: string | null = null;
            commit((d) => {
              const g = resolveGraph(d, graphPath, true);
              if (g) nid = duplicateNode(g, id);
            });
            if (nid) select({ kind: "node", id: nid });
          }}
        >
          <Copy size={13} /> duplicate
        </button>
        <button
          className="danger"
          onClick={() => {
            commit((d) => {
              const g = resolveGraph(d, graphPath, true);
              if (g) removeNode(g, id);
            });
            select(null);
          }}
        >
          <Trash2 size={13} /> delete
        </button>
      </div>

      <ParamRow
        label="when"
        value={node.when ?? ""}
        onChange={(v) =>
          edit((n) => {
            if (v === "") delete n.when;
            else n.when = v as string;
          })
        }
        expr={false}
      />

      {Object.keys(schema).length > 0 && <h4>parameters</h4>}
      {Object.entries(schema).map(([k, sc]) => (
        <ParamRow
          key={k}
          label={sc.label ?? k}
          value={node.params?.[k] ?? sc.def}
          schema={sc}
          onChange={(v) =>
            edit((n) => {
              (n.params ??= {})[k] = v;
            })
          }
          onDrag={dragParam(k)}
        />
      ))}

      {node.attrs && (
        <>
          <h4>
            attributes{" "}
            <span className="note">per primitive, see @name downstream</span>
          </h4>
          {Object.entries(node.attrs).map(([k, v]) => (
            <div className="row" key={k}>
              <label>@{k}</label>
              <input
                className="text"
                defaultValue={v}
                onBlur={(e) => {
                  if (e.target.value !== v)
                    edit((n) => {
                      n.attrs![k] = e.target.value;
                    });
                }}
              />
              <button
                className="fx"
                onClick={() =>
                  edit((n) => {
                    delete n.attrs![k];
                  })
                }
                title="remove"
              >
                <X size={11} />
              </button>
            </div>
          ))}
          <AddRow
            placeholder="new attribute name"
            onAdd={(k) =>
              edit((n) => {
                n.attrs![k] = "0";
              })
            }
          />
        </>
      )}

      {Object.keys(node.in ?? {}).length > 0 && <h4>inputs</h4>}
      {Object.entries(node.in ?? {}).map(([port, v]) => (
        <div className="row" key={port}>
          <label>{port}</label>
          <span className="val wide">
            {(Array.isArray(v) ? v : [v]).map((from) => (
              <span className="chip" key={from}>
                {Array.isArray(v) && (
                  <>
                    <button
                      onClick={() =>
                        edit((_, g) => moveInList(g, id, port, from, -1))
                      }
                      title="earlier"
                    >
                      <ChevronUp size={10} />
                    </button>
                    <button
                      onClick={() =>
                        edit((_, g) => moveInList(g, id, port, from, 1))
                      }
                      title="later"
                    >
                      <ChevronDown size={10} />
                    </button>
                  </>
                )}
                {from}
                <button
                  onClick={() => edit((_, g) => disconnect(g, id, port, from))}
                  title="disconnect"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function AddRow({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (k: string) => void;
}) {
  const [v, setV] = useState("");
  return (
    <div className="row">
      <label />
      <input
        className="text"
        placeholder={placeholder}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) {
            onAdd(v.trim());
            setV("");
          }
        }}
      />
    </div>
  );
}

function LetEditor({
  graph,
  onEdit,
}: {
  graph: GraphDoc;
  onEdit: (fn: (g: GraphDoc) => void) => void;
}) {
  return (
    <>
      <h4>
        let <span className="note">values for $name in this graph</span>
      </h4>
      {Object.entries(graph.let ?? {}).map(([k, v]) => (
        <div className="row" key={k}>
          <label>${k}</label>
          <input
            className="text"
            defaultValue={v}
            onBlur={(e) => {
              if (e.target.value !== v)
                onEdit((g) => {
                  g.let![k] = e.target.value;
                });
            }}
          />
          <button
            className="fx"
            onClick={() =>
              onEdit((g) => {
                delete g.let![k];
              })
            }
            title="remove"
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <AddRow
        placeholder="new let name"
        onAdd={(k) =>
          onEdit((g) => {
            (g.let ??= {})[k] = "0";
          })
        }
      />
    </>
  );
}

function GraphEditor({ graph }: { graph: GraphDoc }) {
  const doc = useEditor((s) => s.doc);
  const graphPath = useEditor((s) => s.graphPath);
  const commit = useEditor((s) => s.commit);
  const select = useEditor((s) => s.select);
  const onEdit = (fn: (g: GraphDoc) => void) =>
    commit((d) => {
      const g = resolveGraph(d, graphPath, true);
      if (g) fn(g);
    });
  const root = graphPath[0];
  const sceneOf = (d: Doc) =>
    root.kind === "scene" ? d.scenes[root.name] : undefined;
  const scene = sceneOf(doc);
  const sceneDrag = useDragParam((d, v) => {
    const sc = sceneOf(d);
    if (sc) sc.seed = Math.round(v);
  }, "seed");
  const numDrag = (apply: (d: Doc, v: number) => void) => {
    const s = useEditor.getState;
    return (v: number, phase: "start" | "move" | "end") => {
      if (phase === "start") s().beginDrag();
      else if (phase === "move") {
        if (s().dragBase) s().drag((d) => apply(d, v));
        else s().commit((d) => apply(d, v));
      } else s().endDrag();
    };
  };
  const printId = Object.keys(graph.nodes).find(
    (k) => graph.nodes[k].type === "risoPrint",
  );
  return (
    <div className="inspector">
      {root.kind === "scene" && graphPath.length === 1 && scene && (
        <>
          <h4>
            scene <span className="note">{scene.name}</span>
          </h4>
          <div className="row">
            <label>about</label>
            <input
              key={scene.name}
              className="text"
              defaultValue={scene.about ?? ""}
              onBlur={(e) =>
                commit((d) => {
                  const sc = sceneOf(d);
                  if (sc) sc.about = e.target.value;
                })
              }
            />
          </div>
          <ParamRow
            label="seed"
            value={scene.seed}
            schema={{ def: 5, min: 1, max: 99, step: 1 }}
            expr={false}
            onChange={(v) =>
              commit((d) => {
                const sc = sceneOf(d);
                if (sc) sc.seed = Number(v);
              })
            }
            onDrag={sceneDrag}
          />
          <ParamRow
            label="duration (s)"
            value={scene.duration ?? 0}
            schema={{ def: 0, min: 0, max: 30, step: 0.05 }}
            expr={false}
            onChange={(v) =>
              commit((d) => {
                const sc = sceneOf(d);
                if (sc) sc.duration = Number(v) || undefined;
              })
            }
            onDrag={numDrag((d, v) => {
              const sc = sceneOf(d);
              if (sc) sc.duration = v || undefined;
            })}
          />
          <label className="chk">
            <input
              type="checkbox"
              checked={!!scene.transition}
              onChange={(e) =>
                commit((d) => {
                  const sc = sceneOf(d);
                  if (sc)
                    sc.transition = e.target.checked
                      ? {
                          type: "iris",
                          open: 0.17,
                          hold: 0.5,
                          close: 0.17,
                          gap: 0.3,
                        }
                      : null;
                })
              }
            />{" "}
            iris transition when shown alone
          </label>
          {scene.transition &&
            (["open", "hold", "close", "gap"] as const).map((k) => (
              <ParamRow
                key={k}
                label={k + " (s)"}
                value={scene.transition![k]}
                schema={{ def: 0.2, min: 0, max: 2, step: 0.01 }}
                expr={false}
                onChange={(v) =>
                  commit((d) => {
                    const sc = sceneOf(d);
                    if (sc?.transition) sc.transition[k] = Number(v);
                  })
                }
                onDrag={numDrag((d, v) => {
                  const sc = sceneOf(d);
                  if (sc?.transition) sc.transition[k] = v;
                })}
              />
            ))}
          {printId && (
            <div className="btns">
              <button onClick={() => select({ kind: "node", id: printId })}>
                print settings
              </button>
            </div>
          )}
        </>
      )}
      {root.kind === "lib" && graphPath.length === 1 && (
        <>
          <h4>
            subnet <span className="note">{root.type}</span>
          </h4>
          <div className="row">
            <label>label</label>
            <input
              className="text"
              defaultValue={doc.lib[root.type].label}
              onBlur={(e) =>
                commit((d) => {
                  d.lib[root.type].label = e.target.value;
                })
              }
            />
          </div>
          <h4>exposed parameters</h4>
          {Object.entries(doc.lib[root.type].params).map(([k, sc]) => (
            <div className="row" key={k}>
              <label>${k}</label>
              <span className="val wide">
                {sc.label ?? ""} · default {String(sc.def)}
                {sc.min !== undefined ? ` · ${sc.min}…${sc.max}` : ""}
              </span>
            </div>
          ))}
          <h4>
            transform{" "}
            <span className="note">places the subnet in its parent</span>
          </h4>
          {["x", "y", "rot", "scale"].map((k) => (
            <ParamRow
              key={k}
              label={k}
              value={doc.lib[root.type].xf?.[k] ?? ""}
              expr={false}
              onChange={(v) =>
                commit((d) => {
                  const xf = (d.lib[root.type].xf ??= {});
                  if (v === "") delete xf[k];
                  else xf[k] = String(v);
                })
              }
            />
          ))}
        </>
      )}
      <h4>graph</h4>
      <div className="row">
        <label>marks</label>
        <select
          value={graph.marks ?? ""}
          onChange={(e) =>
            onEdit((g) => {
              g.marks = e.target.value || undefined;
            })
          }
          title="the marks node other scenes embed with a shot"
        >
          <option value="">(none)</option>
          {Object.keys(graph.nodes).map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>
      <div className="row">
        <label>output</label>
        <select
          value={graph.output}
          onChange={(e) =>
            onEdit((g) => {
              g.output = e.target.value;
            })
          }
        >
          <option value="">(none)</option>
          {Object.keys(graph.nodes).map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>
      <LetEditor graph={graph} onEdit={onEdit} />
      <p className="note">
        Select a node to edit it. Tab adds a node. Drag an output port to an
        input port to wire.
      </p>
    </div>
  );
}

export function Inspector() {
  const doc = useEditor((s) => s.doc);
  const graphPath = useEditor((s) => s.graphPath);
  const selection = useEditor((s) => s.selection);
  const graph = resolveGraph(doc, graphPath);
  if (!graph) return <div className="inspector note">graph not found</div>;
  if (selection?.kind === "node" && graph.nodes[selection.id])
    return (
      <NodeEditor
        key={selection.id}
        graph={graph}
        id={selection.id}
        node={graph.nodes[selection.id]}
      />
    );
  if (selection?.kind === "edge")
    return (
      <div className="inspector">
        <h4>edge</h4>
        <p className="note">
          {selection.from} → {selection.to}.{selection.port}
        </p>
        <p className="note">Press Delete to disconnect.</p>
      </div>
    );
  return <GraphEditor graph={graph} />;
}
