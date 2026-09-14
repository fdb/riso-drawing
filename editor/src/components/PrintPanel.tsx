import { useEditor } from "../store/editor";
import { NodeEditor } from "./Inspector";

/** The compositing pass is the `risoPrint` node in the scene graph; this tab edits it in place. */
export function PrintPanel() {
  const graph = useEditor((s) => s.doc.scene.graph);
  const id = Object.keys(graph.nodes).find(
    (k) => graph.nodes[k].type === "risoPrint",
  );
  if (!id)
    return (
      <div className="inspector">
        <p className="note">
          No print node in the scene. Add a "risoPrint" subnet from the palette
          and wire the stencils into it.
        </p>
      </div>
    );
  return (
    <>
      <p className="note">
        The compositing pass, built from pixel nodes. Open the subnet in the
        graph to see how.
      </p>
      <NodeEditor key={id} graph={graph} id={id} node={graph.nodes[id]} root />
    </>
  );
}
