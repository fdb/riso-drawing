// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- pondBubbles: air trapped under ice, flattened paper discs loosely stacked in a patch ----
LIB.pondBubbles = {
  label: 'Ice bubbles',
  params: {
    x: Q(300, 0, 1080, 1), y: Q(300, 0, 1080, 1), w: Q(120, 10, 600, 1, 'patch width'), h: Q(160, 10, 600, 1, 'patch height'),
    count: Q(12, 1, 80, 1), size: Q(22, 3, 80, 0.5, 'disc radius'), flat: Q(0.55, 0.1, 1, 0.01, 'height over width'), seed: Q(0, 0, 99, 1),
  },
  xf: { x: '$x', y: '$y' },
  graph: {
    nodes: {
      discs: { type: 'copy', params: { n: '$count', x: '(rand(1+$seed)-0.5)*$w + 2*sin(t*0.8+rand(7)*6)', y: '(rand(2+$seed)-0.5)*$h', scale: '0.5+0.7*rand(3+$seed)' }, template: { nodes: {
        e: { type: 'ellipse', params: { x: 0, y: 0, rx: '$size', ry: '$size*$flat', rot: '(rand(4)-0.5)*0.3', n: 24 } } }, output: 'e' } },
      rough: { type: 'hand', in: { geo: 'discs' }, params: { step: 5, wobble: 1.5, wave: 30, jitter: 0.6, press: 0, taper: 0, overshoot: 0, seed: '$seed' } },
      cut: { type: 'fill', in: { geo: 'rough' }, params: { ink: 'all', mode: 'cut' } },
      rim: { type: 'transform', in: { geo: 'rough' }, params: { x: 2, y: 2 } },
      rimS: { type: 'stroke', in: { geo: 'rim' }, params: { ink: 'pink', mode: 'add', w: 1.2, tone: 0.55 } },
      out: { type: 'merge', in: { list: ['cut', 'rimS'] } },
    },
    output: 'out',
  },
};

export const pondBubbles = LIB.pondBubbles;
