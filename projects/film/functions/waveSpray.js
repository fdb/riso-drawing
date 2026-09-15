// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- spray: paper-white droplets and short dashes scattered inside a wired shape, twinkling ----
LIB.waveSpray = {
  label: 'Spray',
  inputs: ['geo'],
  params: {
    dots: Q(120, 0, 2000, 1), size: Q(2, 0.3, 12, 0.1, 'dot radius'), dashes: Q(0, 0, 400, 1), dash: Q(24, 2, 120, 1, 'dash length'),
    w: Q(5, 0.5, 30, 0.5, 'dash width'), twinkle: Q(0.4, 0, 1, 0.01),
  },
  graph: {
    nodes: {
      src: { type: 'input', params: { name: 'geo' } },
      pts: { type: 'scatter', in: { geo: 'src' }, params: { count: '$dots' } },
      dotsC: { type: 'dots', in: { geo: 'pts' }, params: { ink: 'all', mode: 'cut', r: '$size*(0.4+1.2*rand(1))*(1-$twinkle*0.5+$twinkle*0.5*sin(t*5+rand(2)*TAU))' } },
      dpts: { type: 'scatter', in: { geo: 'src' }, params: { count: '$dashes' } },
      dashes: { type: 'copy', in: { points: 'dpts' }, params: { orient: 0, rot: '(rand(4)-0.5)*0.3', x: '3*sin(t*3+rand(5)*TAU)' }, template: { nodes: {
        l: { type: 'line', params: { x0: '-$dash*(0.3+0.7*rand(1))', y0: 0, x1: '$dash*(0.3+0.7*rand(2))', y1: 0, n: 6 } } }, output: 'l' } },
      dashesH: { type: 'hand', in: { geo: 'dashes' }, params: { step: 4, wobble: 1.5, wave: 30, jitter: 0.5, press: 0.5, taper: 0.6, overshoot: 0 } },
      dashesW: { type: 'wrangle', in: { geo: 'dashesH' }, params: { w: '@pw*$w/2' } },
      dashesS: { type: 'stroke', in: { geo: 'dashesW' }, params: { ink: 'all', mode: 'cut' } },
      out: { type: 'merge', in: { list: ['dotsC', 'dashesS'] } },
    },
    output: 'out',
  },
};

export const waveSpray = LIB.waveSpray;
