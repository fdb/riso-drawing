// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- rain: tapered streaks falling through a box, wrapping at the bottom ----
LIB.rain = {
  label: 'Rain streaks',
  params: {
    x: Q(0, 0, 1080, 1), y: Q(0, 0, 1080, 1), w: Q(1080, 0, 1080, 1), h: Q(1080, 0, 1080, 1),
    count: Q(60, 0, 400, 1), len: Q(120, 5, 600, 1), slant: Q(0.05, -1, 1, 0.01, 'dx per dy'), width: Q(2, 0.2, 10, 0.1),
    speed: Q(200, 0, 2000, 1, 'px per second'), ink: { def: 'all', kind: 'ink' }, mode: { def: 'cut', kind: 'mode' }, seed: Q(1, 0, 99, 1),
  },
  graph: {
    nodes: {
      streaks: { type: 'copy', params: { n: '$count', x: '$x + rand(1+$seed)*$w', y: '$y + ((rand(2+$seed)*$h + t*$speed) % $h)' }, template: {
        let: { L: '$len*(0.3+0.7*rand(3))' },
        nodes: {
          ln: { type: 'line', params: { x0: 0, y0: 0, x1: '$slant*$L', y1: '$L', n: 10 } },
          w: { type: 'wrangle', in: { geo: 'ln' }, params: { w: '$width*(0.4+0.6*sin(@v*PI))' } },
        }, output: 'w' } },
      soft: { type: 'hand', in: { geo: 'streaks' }, params: { step: 6, wobble: 1.5, wave: 60, jitter: 0.3, press: 0.3, taper: 0.4, overshoot: 0 } },
      out: { type: 'stroke', in: { geo: 'soft' }, params: { ink: '$ink', mode: '$mode' } },
    },
    output: 'out',
  },
};

export const rain = LIB.rain;
