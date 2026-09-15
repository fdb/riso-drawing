// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- wavering: one ring of a sound wave. Brush-stroke arc segments in yellow, a red edge on the
// inside, a paper sliver on the outside; tapered ends, uneven spacing, a slow pulse ----
LIB.wavering = {
  label: 'Sound wave ring',
  params: {
    x: Q(540, 0, 1080, 1), y: Q(540, 0, 1080, 1), r: Q(400, 20, 1200, 1), a0: Q(-200, -360, 360, 1), a1: Q(20, -360, 360, 1),
    count: Q(7, 1, 40, 1), span: Q(24, 2, 90, 1, 'segment span (deg)'), w: Q(14, 1, 60, 0.5), pulse: Q(6, 0, 40, 1, 'radius pulse (px)'),
    phase: Q(0, 0, 6.3, 0.01), seed: Q(1, 0, 99, 1),
  },
  xf: { x: '$x', y: '$y' },
  graph: {
    let: { R: '$r + $pulse*sin(t*2 + $phase)' },
    nodes: {
      segs: { type: 'copy', params: { n: '$count' }, template: {
        let: { a: '$a0 + ($a1-$a0)*(@i+0.5)/@n + (rand(1+$seed)-0.5)*10', s: '$span*(0.6+0.7*rand(2+$seed))' },
        nodes: {
          mid: { type: 'ellipse', params: { x: 0, y: 0, rx: '$R', ry: '$R', a0: '$a-$s/2', a1: '$a+$s/2', n: 14 } },
          midA: { type: 'attr', in: { geo: 'mid' }, attrs: { kind: 0 } },
          inn: { type: 'ellipse', params: { x: 0, y: 0, rx: '$R-$w*0.42', ry: '$R-$w*0.42', a0: '$a-$s/2+2', a1: '$a+$s/2-2', n: 14 } },
          innA: { type: 'attr', in: { geo: 'inn' }, attrs: { kind: 1 } },
          out: { type: 'ellipse', params: { x: 0, y: 0, rx: '$R+$w*0.42', ry: '$R+$w*0.42', a0: '$a-$s/2+3', a1: '$a+$s/2-3', n: 14 } },
          outA: { type: 'attr', in: { geo: 'out' }, attrs: { kind: 2 } },
          m: { type: 'merge', in: { list: ['midA', 'innA', 'outA'] } },
        }, output: 'm' } },
      widths: { type: 'wrangle', in: { geo: 'segs' }, params: { w: '(@kind == 0 ? $w : @kind == 1 ? $w*0.45 : $w*0.2) * pow(sin(@v*PI), 0.6)' } },
      soft: { type: 'hand', in: { geo: 'widths' }, params: { step: 6, wobble: '$w*0.12', wave: 90, jitter: 0.5, press: 0.35, taper: 0.5, overshoot: 0, seed: '$seed' } },
      body: { type: 'filter', in: { geo: 'soft' }, params: { expr: '@kind == 0' } },
      bodyY: { type: 'stroke', in: { geo: 'body' }, params: { ink: 'yellow', mode: 'solid' } },
      edge: { type: 'filter', in: { geo: 'soft' }, params: { expr: '@kind == 1' } },
      edgeP: { type: 'stroke', in: { geo: 'edge' }, params: { ink: 'pink', mode: 'solid' } },
      edgeY: { type: 'stroke', in: { geo: 'edge' }, params: { ink: 'yellow', mode: 'add', tone: 0.6 } },
      lite: { type: 'filter', in: { geo: 'soft' }, params: { expr: '@kind == 2' } },
      liteC: { type: 'stroke', in: { geo: 'lite' }, params: { ink: 'all', mode: 'cut' } },
      o: { type: 'merge', in: { list: ['bodyY', 'edgeP', 'edgeY', 'liteC'] } },
    },
    output: 'o',
  },
};

export const wavering = LIB.wavering;
