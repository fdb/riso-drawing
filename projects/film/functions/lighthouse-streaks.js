// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- streaks: tapered lines scattered inside a wired shape (rain, aurora, hatching). They slide along their direction over time ----
LIB.lighthouseStreaks = {
  label: 'Streaks',
  inputs: ['geo'],
  params: {
    count: Q(200, 0, 3000, 1), angle: Q(-70, -180, 180, 1, 'direction (deg, 0 = right, 90 = down)'), spread: Q(4, 0, 90, 1, 'angle jitter (deg)'),
    len: Q(60, 2, 800, 1), vary: Q(0.6, 0, 1, 0.01, 'length variation'), w: Q(1.5, 0.2, 40, 0.1),
    ink: { def: 'all', kind: 'ink' }, mode: { def: 'cut', kind: 'mode' }, tone: Q(1, 0, 1, 0.01), speed: Q(0, 0, 2000, 1, 'slide (px/s)'), seed: Q(0, 0, 99, 1),
  },
  graph: {
    nodes: {
      src: { type: 'input', params: { name: 'geo' } },
      pts: { type: 'scatter', in: { geo: 'src' }, params: { count: '$count' } },
      lines: { type: 'copy', in: { points: 'pts' }, params: { orient: 0, x: '$speed > 0 ? cos($a)*(((t*$speed + rand(7)*$L*3) % ($L*3)) - $L*1.5) : 0', y: '$speed > 0 ? sin($a)*(((t*$speed + rand(7)*$L*3) % ($L*3)) - $L*1.5) : 0' }, template: {
        let: { a: '($angle + (rand(1+$seed)-0.5)*$spread)*PI/180', L: '$len*(1-$vary+$vary*rand(2+$seed))' },
        nodes: {
          l: { type: 'line', params: { x0: '-cos($a)*$L/2', y0: '-sin($a)*$L/2', x1: 'cos($a)*$L/2', y1: 'sin($a)*$L/2', n: 8 } },
          w: { type: 'wrangle', in: { geo: 'l' }, params: { w: '$w*(0.4+0.9*rand(3+$seed))*(0.35+0.65*sin(@v*PI))' } },
        }, output: 'w' } },
      out: { type: 'stroke', in: { geo: 'lines' }, params: { ink: '$ink', mode: '$mode', tone: '$tone' } },
    },
    output: 'out',
  },
};

export const lighthouseStreaks = LIB.lighthouseStreaks;
