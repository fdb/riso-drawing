// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- sonar: a fan of paper-white arcs above a point, hand-drawn, flickering ----
LIB.batSonar = {
  label: 'Sonar arcs',
  params: {
    x: Q(0, -1080, 1080, 1), y: Q(0, -1080, 1080, 1), r0: Q(40, 0, 400, 1, 'first radius'), gap: Q(30, 2, 200, 1), count: Q(4, 1, 12, 1),
    a0: Q(-150, -360, 360, 1), a1: Q(-30, -360, 360, 1), w: Q(5, 0.5, 30, 0.5), flicker: Q(0.3, 0, 1, 0.01), seed: Q(0, 0, 99, 1),
  },
  xf: { x: '$x', y: '$y' },
  graph: {
    nodes: {
      arcs: { type: 'copy', params: { n: '$count' }, template: {
        nodes: { a: { type: 'ellipse', params: { x: 0, y: 0, rx: '$r0 + @i*$gap*(0.9+0.2*rand(1))', ry: '($r0 + @i*$gap*(0.9+0.2*rand(1)))*0.85', a0: '$a0 + (rand(2)-0.5)*14', a1: '$a1 + (rand(3)-0.5)*14', n: 40 } } },
        output: 'a' } },
      rough: { type: 'hand', in: { geo: 'arcs' }, params: { step: 5, wobble: 1.5, wave: 50, jitter: 0.5, press: 0.5, taper: 0.5, overshoot: 3, seed: '$seed' } },
      thick: { type: 'wrangle', in: { geo: 'rough' }, params: { w: '@pw*$w/2*(1-$flicker*0.5+$flicker*0.5*sin(t*7+$seed+@i*0.3))' } },
      cut: { type: 'stroke', in: { geo: 'thick' }, params: { ink: 'all', mode: 'cut', w: '$w' } },
    },
    output: 'cut',
  },
};

export const batSonar = LIB.batSonar;
