// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- foam: paper-white surf along a wired polyline. A hand-drawn cut stroke that thickens
// towards its end, an optional curling lip (a hook shape) at the end, and spray dots under it ----
LIB.waveFoam = {
  label: 'Foam',
  inputs: ['geo'],
  params: {
    w0: Q(6, 0, 80, 0.5, 'width at the start'), w1: Q(6, 0, 120, 0.5, 'width at the end'), from: Q(0.5, 0, 1, 0.01, 'thicken from v'),
    hook: Q(0, 0, 4, 0.05, 'curling lip at the end (0 = none)'), spray: Q(0, 0, 200, 1, 'spray dots at the end'),
    wobble: Q(5, 0, 30, 0.5), bob: Q(2, 0, 20, 0.5, 'sway with time (px)'), seed: Q(0, 0, 99, 1),
  },
  xf: { y: '$bob*sin(t*1.4+$seed)' },
  graph: {
    nodes: {
      src: { type: 'input', params: { name: 'geo' } },
      line: { type: 'hand', in: { geo: 'src' }, params: { step: 6, wobble: '$wobble', wave: 100, jitter: 1, press: 0.5, taper: 0.2, overshoot: 0, seed: '$seed' } },
      lineW: { type: 'wrangle', in: { geo: 'line' }, params: { w: '@pw/2*($w0 + ($w1-$w0)*ease(clamp((@v-$from)/(1.001-$from))))*(0.7+0.6*noise(@v*800+$seed*50, 1, 60, 8))' } },
      lineS: { type: 'stroke', in: { geo: 'lineW' }, params: { ink: 'all', mode: 'cut' } },
      // the last point of the line, with its heading
      cnt: { type: 'attr', in: { geo: 'src' }, attrs: { cnt: '@n' } },
      end: { type: 'pointsAlong', in: { geo: 'cnt' }, params: { start: '@cnt-3', step: 1000 } },
      hook: { type: 'copy', in: { points: 'end' }, params: { scale: '$hook' }, when: '$hook > 0', template: { nodes: {
        p: { type: 'polygon', params: { pts: '-10 -6 10 -14 30 -20 50 -14 58 2 46 16 26 20 8 12 14 -2 34 -6 40 2 30 8 12 4' } } }, output: 'p' } },
      hookH: { type: 'hand', in: { geo: 'hook' }, params: { step: 5, wobble: 2, wave: 40, jitter: 0.6, press: 0, taper: 0, overshoot: 0 } },
      hookF: { type: 'fill', in: { geo: 'hookH' }, params: { ink: 'all', mode: 'cut' } },
      sprayPts: { type: 'copy', in: { points: 'end' }, params: { orient: 0, y: 30 }, when: '$spray > 0', template: { nodes: {
        s: { type: 'scatter', params: { x: 10, y: 20, r: 55, count: '$spray' } } }, output: 's' } },
      sprayD: { type: 'dots', in: { geo: 'sprayPts' }, params: { ink: 'all', mode: 'cut', r: '(1+2.2*rand(1))*(0.8+0.2*sin(t*5+rand(2)*TAU))' } },
      out: { type: 'merge', in: { list: ['lineS', 'hookF', 'sprayD'] } },
    },
    output: 'out',
  },
};

export const waveFoam = LIB.waveFoam;
