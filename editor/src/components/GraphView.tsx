import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, LayoutGrid, Maximize2, ChevronRight } from "lucide-react";
import { useEditor } from "../store/editor";
import { resolveGraph, connect, edgesOf } from "../lib/graphOps";
import {
  layoutPositions,
  nodeHeight,
  NODE_W,
  HEAD_H,
  ROW_H,
} from "../lib/layout";
import { inputsOf, isSubnet, nodeLabel, catOf, evalPath } from "../lib/engine";
import type { GraphDoc, GraphPathStep, Selection } from "../lib/types";

interface Cam {
  x: number;
  y: number;
  k: number;
}
const portY = (i: number) => HEAD_H + 14 + i * ROW_H;
const edgePath = (x0: number, y0: number, x1: number, y1: number) => {
  const dx = Math.max(40, Math.abs(x1 - x0) * 0.5);
  return `M ${x0} ${y0} C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}`;
};

function crumbs(path: GraphPathStep[]): string[] {
  return path.map((s) =>
    s.kind === "scene"
      ? "scene"
      : s.kind === "lib"
        ? s.type
        : `${s.node} (template)`,
  );
}

/** Node graph with wiring: drag nodes, drag from an output port onto an input port, click an edge to select it. */
export function GraphView() {
  const doc = useEditor((s) => s.doc);
  const graphPath = useEditor((s) => s.graphPath);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const setPath = useEditor((s) => s.setPath);
  const dive = useEditor((s) => s.dive);
  const commit = useEditor((s) => s.commit);
  const setUi = useEditor((s) => s.setUi);
  const display = useEditor((s) => s.ui.display);

  const graph: GraphDoc | null = useMemo(
    () => resolveGraph(doc, graphPath),
    [doc, graphPath],
  );
  const pos = useMemo(() => (graph ? layoutPositions(graph) : {}), [graph]);
  const edges = useMemo(() => (graph ? edgesOf(graph) : []), [graph]);

  const svgRef = useRef<SVGSVGElement>(null);
  const [cam, setCam] = useState<Cam>({ x: 20, y: 20, k: 1 });
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const [wire, setWire] = useState<{
    from: string;
    x: number;
    y: number;
  } | null>(null);
  const [hoverPort, setHoverPort] = useState<{
    id: string;
    port: string;
  } | null>(null);
  const pan = useRef<{
    x: number;
    y: number;
    cx: number;
    cy: number;
    moved: boolean;
  } | null>(null);
  const lastMouse = useRef<[number, number]>([120, 120]);

  const toGraph = (clientX: number, clientY: number): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [
      (clientX - r.left - cam.x) / cam.k,
      (clientY - r.top - cam.y) / cam.k,
    ];
  };

  // fit the view when the graph path changes
  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphPath]);

  const fit = () => {
    if (!graph || !svgRef.current) return;
    const ids = Object.keys(graph.nodes);
    if (!ids.length) return setCam({ x: 20, y: 20, k: 1 });
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    for (const id of ids) {
      const [x, y] = pos[id];
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + NODE_W);
      y1 = Math.max(y1, y + nodeHeight(graph.nodes[id].type));
    }
    const r = svgRef.current.getBoundingClientRect();
    const k = Math.min(
      1.2,
      Math.max(
        0.25,
        Math.min((r.width - 40) / (x1 - x0), (r.height - 40) / (y1 - y0)),
      ),
    );
    setCam({
      k,
      x: (r.width - (x1 - x0) * k) / 2 - x0 * k,
      y: (r.height - (y1 - y0) * k) / 2 - y0 * k,
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left,
      my = e.clientY - r.top;
    const k = Math.min(3, Math.max(0.2, cam.k * Math.exp(-e.deltaY * 0.0015)));
    setCam({
      k,
      x: mx - ((mx - cam.x) * k) / cam.k,
      y: my - ((my - cam.y) * k) / cam.k,
    });
  };

  const onBgDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pan.current = {
      x: e.clientX,
      y: e.clientY,
      cx: cam.x,
      cy: cam.y,
      moved: false,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    lastMouse.current = toGraph(e.clientX, e.clientY);
    if (pan.current) {
      const dx = e.clientX - pan.current.x,
        dy = e.clientY - pan.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) pan.current.moved = true;
      setCam({ ...cam, x: pan.current.cx + dx, y: pan.current.cy + dy });
    }
    if (drag) {
      const [gx, gy] = toGraph(e.clientX, e.clientY);
      setDrag({
        ...drag,
        x: gx - dragOff.current[0],
        y: gy - dragOff.current[1],
      });
    }
    if (wire) {
      const [gx, gy] = toGraph(e.clientX, e.clientY);
      setWire({ ...wire, x: gx, y: gy });
      const el = document.elementFromPoint(
        e.clientX,
        e.clientY,
      ) as HTMLElement | null;
      const p = el?.closest?.("[data-port]") as HTMLElement | null;
      setHoverPort(p ? { id: p.dataset.node!, port: p.dataset.port! } : null);
    }
  };
  const onUp = () => {
    if (pan.current) {
      if (!pan.current.moved) select(null);
      pan.current = null;
    }
    if (drag) {
      const d = drag;
      const snapshot = pos;
      commit((doc) => {
        const g = resolveGraph(doc, graphPath);
        if (!g?.nodes[d.id]) return;
        // pin every auto-placed node so the rest of the layout does not shift
        for (const id of Object.keys(g.nodes))
          if (!g.nodes[id].pos && snapshot[id])
            g.nodes[id].pos = [
              Math.round(snapshot[id][0]),
              Math.round(snapshot[id][1]),
            ];
        g.nodes[d.id].pos = [Math.round(d.x), Math.round(d.y)];
      });
      setDrag(null);
    }
    if (wire) {
      if (hoverPort) {
        const w = wire,
          hp = hoverPort;
        commit((doc) => {
          const g = resolveGraph(doc, graphPath);
          if (g) connect(g, w.from, hp.id, hp.port);
        });
      }
      setWire(null);
      setHoverPort(null);
    }
  };

  const dragOff = useRef<[number, number]>([0, 0]);
  const onNodeDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    select({ kind: "node", id });
    const [gx, gy] = toGraph(e.clientX, e.clientY);
    dragOff.current = [gx - pos[id][0], gy - pos[id][1]];
    setDrag({ id, x: pos[id][0], y: pos[id][1] });
    svgRef.current!.setPointerCapture(e.pointerId);
  };
  const onOutDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const [gx, gy] = toGraph(e.clientX, e.clientY);
    setWire({ from: id, x: gx, y: gy });
    svgRef.current!.setPointerCapture(e.pointerId);
  };
  const onNodeDouble = (id: string) => {
    if (!graph) return;
    const n = graph.nodes[id];
    if (isSubnet(n.type)) dive({ kind: "lib", type: n.type, via: id });
    else if (n.template) dive({ kind: "template", node: id });
  };
  const openPalette = () =>
    setUi({ paletteOpen: true, paletteAt: lastMouse.current });
  const autoLayout = () =>
    commit((doc) => {
      const g = resolveGraph(doc, graphPath);
      if (g) for (const n of Object.values(g.nodes)) delete n.pos;
    });

  const viewPath = evalPath(graphPath);
  const isDisplayed = (id: string) =>
    !!display && display.path === viewPath && display.id === id;
  const toggleDisplay = (id: string) =>
    setUi({ display: isDisplayed(id) ? null : { path: viewPath, id } });
  const crumbList = crumbs(graphPath);
  const posOf = (id: string): [number, number] =>
    drag?.id === id ? [drag.x, drag.y] : pos[id];
  const isSel = (s: Selection, id: string) => s?.kind === "node" && s.id === id;

  return (
    <div className="graphview">
      <div className="graph-bar">
        <div className="crumbs">
          {crumbList.map((c, i) => (
            <span key={i}>
              {i > 0 && <ChevronRight size={12} />}
              <button
                className={i === crumbList.length - 1 ? "on" : ""}
                onClick={() => setPath(graphPath.slice(0, i + 1))}
              >
                {c}
              </button>
            </span>
          ))}
          {graphPath[0].kind === "lib" && (
            <button
              className="ghost"
              onClick={() => setPath([{ kind: "scene" }])}
            >
              ← scene
            </button>
          )}
        </div>
        <div className="group">
          <button onClick={openPalette} title="Add node (Tab)">
            <Plus size={14} /> node
          </button>
          <button
            onClick={autoLayout}
            title="Forget stored positions and lay out by depth"
          >
            <LayoutGrid size={14} /> layout
          </button>
          <button onClick={fit} title="Fit">
            <Maximize2 size={14} />
          </button>
          <span className="hint">
            drag output ● to an input ● to wire · double-click to dive in · Tab
            adds · Delete removes
          </span>
        </div>
      </div>
      {!graph ? (
        <div className="graph-empty">graph not found</div>
      ) : (
        <svg
          ref={svgRef}
          className="graph-svg"
          onWheel={onWheel}
          onPointerDown={onBgDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onDoubleClick={(e) => {
            // pointer capture retargets dblclick to the svg, so find the node under the pointer
            const el = document.elementFromPoint(e.clientX, e.clientY);
            const g = el?.closest("[data-nodeid]") as HTMLElement | null;
            if (g) onNodeDouble(g.dataset.nodeid!);
            else if (e.target === svgRef.current) openPalette();
          }}
        >
          <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
            {edges.map((e) => {
              const [x0, y0] = posOf(e.from),
                [x1, y1] = posOf(e.to);
              const i = inputsOf(graph.nodes[e.to].type).indexOf(e.port);
              const sel =
                selection?.kind === "edge" &&
                selection.from === e.from &&
                selection.to === e.to &&
                selection.port === e.port;
              return (
                <path
                  key={`${e.from}>${e.to}.${e.port}`}
                  className={`edge cat-${catOf(graph.nodes[e.from].type)} ${sel ? "selected" : ""}`}
                  d={edgePath(
                    x0 + NODE_W,
                    y0 + nodeHeight(graph.nodes[e.from].type) / 2,
                    x1,
                    y1 + portY(Math.max(0, i)),
                  )}
                  onPointerDown={(ev) => {
                    ev.stopPropagation();
                    select({ kind: "edge", ...e });
                  }}
                />
              );
            })}
            {wire && (
              <path
                className="edge wire"
                d={edgePath(
                  posOf(wire.from)[0] + NODE_W,
                  posOf(wire.from)[1] +
                    nodeHeight(graph.nodes[wire.from].type) / 2,
                  wire.x,
                  wire.y,
                )}
              />
            )}
            {Object.entries(graph.nodes).map(([id, n]) => {
              const [x, y] = posOf(id);
              const h = nodeHeight(n.type);
              const ins = inputsOf(n.type);
              const cat = catOf(n.type);
              const dive = isSubnet(n.type) || !!n.template;
              return (
                <g
                  key={id}
                  className={`node cat-${cat} ${isSel(selection, id) ? "selected" : ""} ${graph.output === id ? "output" : ""} ${n.enabled === false ? "off" : ""} ${isDisplayed(id) ? "displayed" : ""}`}
                  transform={`translate(${x} ${y})`}
                  data-testid={`node-${id}`}
                  data-nodeid={id}
                >
                  <rect
                    className="body"
                    width={NODE_W}
                    height={h}
                    onPointerDown={(e) => onNodeDown(e, id)}
                  />
                  <rect
                    className="head"
                    width={NODE_W}
                    height={HEAD_H}
                    onPointerDown={(e) => onNodeDown(e, id)}
                  />
                  <text className="title" x={8} y={16}>
                    {id}
                  </text>
                  <text className="type" x={NODE_W - 8} y={16} textAnchor="end">
                    {nodeLabel(n.type)}
                    {dive ? " ▸" : ""}
                  </text>
                  {ins.map((p, i) => (
                    <g key={p} transform={`translate(0 ${portY(i)})`}>
                      <circle
                        className={`port in ${hoverPort?.id === id && hoverPort.port === p ? "hot" : ""}`}
                        r={5}
                        data-node={id}
                        data-port={p}
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                      <text className="port-label" x={10} y={4}>
                        {p}
                      </text>
                    </g>
                  ))}
                  <circle
                    className="port out"
                    cx={NODE_W}
                    cy={h / 2}
                    r={5}
                    onPointerDown={(e) => onOutDown(e, id)}
                  />
                  <circle
                    className={`eye ${isDisplayed(id) ? "on" : ""}`}
                    cx={NODE_W - 10}
                    cy={h - 9}
                    r={4.5}
                    data-testid={`eye-${id}`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      toggleDisplay(id);
                    }}
                  >
                    <title>display this node in the viewport</title>
                  </circle>
                  {n.when !== undefined && (
                    <text className="when" x={8} y={h - 6}>
                      when {String(n.when)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}
