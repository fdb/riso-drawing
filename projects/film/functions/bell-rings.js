// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- rings: concentric hand-drawn arcs around a centre (sound, light, halo). Radii and angles vary per arc ----
LIB.bellRings = {
  label: 'Concentric arcs',
  params: {
    x: Q(540, 0, 1080, 1), y: Q(540, 0, 1080, 1), r0: Q(100, 0, 1200, 1, 'first radius'), gap: Q(60, 1, 400, 1), count: Q(5, 1, 40, 1),
    a0: Q(-180, -360, 360, 1, 'start angle (deg)'), a1: Q(180, -360, 360, 1, 'end angle (deg)'), spread: Q(6, 0, 60, 1, 'angle jitter (deg)'),
    ink: { def: 'yellow', kind: 'ink' }, mode: { def: 'solid', kind: 'mode' }, w: Q(3, 0.2, 40, 0.1), tone: Q(1, 0, 1, 0.01),
    wobble: Q(2, 0, 20, 0.1), taper: Q(0, 0, 1, 0.01), drift: Q(0, 0, 100, 1, 'radius drift per second (px)'), seed: Q(0, 0, 99, 1),
  },
  graph: {
    nodes: {
      arcs: { type: 'copy', params: { n: '$count' }, template: {
        let: { r: '$r0 + @i*$gap + (rand(1)-0.5)*$gap*0.25 + ($drift > 0 ? (t*$drift) % $gap : 0)', da: '(rand(2)-0.5)*$spread', db: '(rand(3)-0.5)*$spread' },
        nodes: { a: { type: 'ellipse', params: { x: '$x', y: '$y', rx: '$r', ry: '$r', a0: '$a0 + $da', a1: '$a1 + $db', n: 'min(360, max(12, round($r*abs($a1-$a0)/360*TAU/10)))' } } },
        output: 'a' } },
      wide: { type: 'wrangle', in: { geo: 'arcs' }, params: { w: '$w' } },
      drawn: { type: 'hand', in: { geo: 'wide' }, params: { step: 7, wobble: '$wobble', wave: 140, jitter: 0.4, press: 0.35, taper: '$taper', overshoot: 0, seed: '$seed' } },
      out: { type: 'stroke', in: { geo: 'drawn' }, params: { ink: '$ink', mode: '$mode', tone: '$tone' } },
    },
    output: 'out',
  },
};

export const bellRings = LIB.bellRings;
