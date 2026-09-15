// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- telescopeDishlet: a small radio dish in silhouette, a tilted cup on a stem, dark navy ----
LIB.telescopeDishlet = {
  label: 'Distant dish',
  params: { x: Q(800, 0, 1080, 1), y: Q(800, 0, 1080, 1), r: Q(40, 5, 200, 1), tilt: Q(-0.5, -3.2, 3.2, 0.01), stem: Q(45, 0, 200, 1) },
  xf: { x: '$x', y: '$y' },
  graph: {
    nodes: {
      cup: { type: 'ellipse', params: { x: 0, y: 0, rx: '$r', ry: '$r*0.62', rot: '$tilt', n: 40 } },
      cupH: { type: 'hand', in: { geo: 'cup' }, params: { step: 5, wobble: 1, wave: 40, jitter: 0.4, press: 0, taper: 0, overshoot: 0 } },
      post: { type: 'polygon', params: { pts: '-4 0 4 0 6 $stem -6 $stem' } },
      foot: { type: 'ellipse', params: { x: 0, y: '$stem', rx: '$r*0.5', ry: '$r*0.16', n: 20 } },
      all: { type: 'merge', in: { list: ['cupH', 'post', 'foot'] } },
      fb: { type: 'fill', in: { geo: 'all' }, params: { ink: 'blue', mode: 'solid' } },
      fp: { type: 'fill', in: { geo: 'all' }, params: { ink: 'pink', mode: 'add', tone: 0.8 } },
      out: { type: 'merge', in: { list: ['fb', 'fp'] } },
    },
    output: 'out',
  },
};

export const telescopeDishlet = LIB.telescopeDishlet;
