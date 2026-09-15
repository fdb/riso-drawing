// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- bubble: a paper ring with a highlight ----
LIB.bubble = {
  label: 'Bubble',
  params: { x: Q(540, 0, 1080, 1), y: Q(542, 0, 1080, 1), r: Q(21, 5, 60, 0.5), ring: Q(3, 1, 8, 0.25, 'ring width') },
  graph: {
    nodes: {
      c: { type: 'circle', params: { x: '$x', y: '$y', r: '$r' } },
      fb: { type: 'fill', in: { geo: 'c' }, params: { ink: 'blue' } },
      fp: { type: 'fill', in: { geo: 'c' }, params: { ink: 'pink', tone: 0.7 } },
      rc: { type: 'circle', params: { x: '$x', y: '$y', r: '$r - $ring/2' } },
      ring: { type: 'stroke', in: { geo: 'rc' }, params: { ink: 'all', mode: 'cut', w: '$ring' } },
      hi: { type: 'ellipse', params: { x: '$x-$r*0.45', y: '$y-$r*0.45', rx: '$r*0.28', ry: '$r*0.16', rot: -0.7 } },
      hiS: { type: 'fill', in: { geo: 'hi' }, params: { ink: 'all', mode: 'cut' } },
      out: { type: 'merge', in: { list: ['fb', 'fp', 'ring', 'hiS'] } },
    },
    output: 'out',
  },
};

export const bubble = LIB.bubble;
