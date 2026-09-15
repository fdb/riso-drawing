// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- web flake: concentric hexagons and spokes ----
LIB.webflake = {
  label: 'Web flake',
  params: { x: Q(100, 0, 1080, 1), y: Q(180, 0, 1080, 1), r: Q(90, 10, 400, 1), rot: Q(0, -3.2, 3.2, 0.01), rings: Q(5, 1, 12, 1), spokes: Q(12, 3, 36, 1), width: Q(2.5, 0.5, 10, 0.1) },
  xf: { x: '$x', y: '$y', rot: '$rot' },
  graph: {
    nodes: {
      rings: { type: 'copy', params: { n: '$rings', scale: '(@i+1)/@n', rot: '@i*0.12' }, template: { nodes: { h: { type: 'circle', params: { x: 0, y: 0, r: '$r', n: 6 } } }, output: 'h' } },
      spokes: { type: 'rays', params: { x: 0, y: 0, a0: 0, a1: '360-360/$spokes', count: '$spokes', r0: 0, r1: '$r' } },
      all: { type: 'merge', in: { list: ['rings', 'spokes'] } },
      halo: { type: 'stroke', in: { geo: 'all' }, params: { ink: 'blue', mode: 'add', w: '$width+2' } },
      lines: { type: 'stroke', in: { geo: 'all' }, params: { ink: 'all', mode: 'cut', w: '$width' } },
      out: { type: 'merge', in: { list: ['halo', 'lines'] } },
    },
    output: 'out',
  },
};

export const webflake = LIB.webflake;
