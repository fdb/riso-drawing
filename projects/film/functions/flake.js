// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- flake: a snowflake. One arm with branches, copied around; optional blue halo under paper-white lines ----
LIB.flake = {
  label: 'Snowflake',
  params: {
    x: Q(540, 0, 1080, 1), y: Q(540, 0, 1080, 1), r: Q(200, 10, 600, 1), rot: Q(0, -3.2, 3.2, 0.01), arms: Q(6, 3, 12, 1),
    branches: Q(3, 0, 6, 1), spread: Q(0.95, 0.3, 1.5, 0.01, 'branch angle (rad)'), width: Q(1, 0.2, 4, 0.05),
    ink: { def: 'all', kind: 'ink' }, mode: { def: 'cut', kind: 'mode' }, tone: Q(1, 0, 1, 0.01), halo: Q(1, 0, 1, 1, 'blue halo'),
    core: Q(1, 0, 1, 1, 'yellow hex core'),
  },
  xf: { x: '$x', y: '$y', rot: '$rot' },
  graph: {
    nodes: {
      arm: { type: 'copy', params: { n: '$arms', rot: '@i/@n*TAU' }, template: {
        nodes: {
          main: { type: 'line', params: { x0: '$r*0.12', y0: 0, x1: '$r', y1: 0, n: 24 } },
          mainW: { type: 'wrangle', in: { geo: 'main' }, params: { w: '$r*0.03*$width*(1-0.5*@v)' } },
          bpts: { type: 'pointsAlong', in: { geo: 'main' }, params: { start: '6', step: 'round(17/$branches)', margin: 2 } },
          br: { type: 'copy', in: { points: 'bpts' }, params: { orient: 0 }, template: {
            nodes: {
              up: { type: 'line', params: { x0: 0, y0: 0, x1: 'cos(-$spread)*$r*(0.32-0.2*@v)', y1: 'sin(-$spread)*$r*(0.32-0.2*@v)', n: 8 } },
              dn: { type: 'line', params: { x0: 0, y0: 0, x1: 'cos($spread)*$r*(0.32-0.2*@v)', y1: 'sin($spread)*$r*(0.32-0.2*@v)', n: 8 } },
              both: { type: 'merge', in: { list: ['up', 'dn'] } },
              bw: { type: 'wrangle', in: { geo: 'both' }, params: { w: '$r*0.02*$width*(1-0.6*@v)' } },
              twigs: { type: 'pointsAlong', in: { geo: 'both' }, params: { start: 3, step: 2, margin: 1 } },
              twig: { type: 'copy', in: { points: 'twigs' }, params: { orient: 1 }, template: { nodes: {
                a: { type: 'line', params: { x0: 0, y0: 0, x1: 'cos(-1.0)*$r*0.06', y1: 'sin(-1.0)*$r*0.06', n: 2 } },
                b: { type: 'line', params: { x0: 0, y0: 0, x1: 'cos(1.0)*$r*0.06', y1: 'sin(1.0)*$r*0.06', n: 2 } },
                ab: { type: 'merge', in: { list: ['a', 'b'] } },
                abw: { type: 'wrangle', in: { geo: 'ab' }, params: { w: '$r*0.012*$width' } } }, output: 'abw' } },
              all: { type: 'merge', in: { list: ['bw', 'twig'] } },
            }, output: 'all' } },
          armAll: { type: 'merge', in: { list: ['mainW', 'br'] } },
        }, output: 'armAll' } },
      haloS: { type: 'stroke', in: { geo: 'arm' }, params: { ink: 'blue', mode: 'add', w: 1 }, when: '$halo' },
      haloW: { type: 'wrangle', in: { geo: 'arm' }, params: { w: '@pw + $r*0.014' } },
      haloS2: { type: 'stroke', in: { geo: 'haloW' }, params: { ink: 'blue', mode: 'add' }, when: '$halo' },
      armS: { type: 'stroke', in: { geo: 'arm' }, params: { ink: '$ink', mode: '$mode', tone: '$tone' } },
      hex: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.16', n: 6 } },
      hexY: { type: 'fill', in: { geo: 'hex' }, params: { ink: 'yellow', mode: 'solid' }, when: '$core' },
      hexB: { type: 'stroke', in: { geo: 'hex' }, params: { ink: 'blue', mode: 'add', w: '$r*0.012' }, when: '$core' },
      hex2: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.1', n: 6 } },
      hex2B: { type: 'stroke', in: { geo: 'hex2' }, params: { ink: 'blue', mode: 'add', w: '$r*0.008' }, when: '$core' },
      out: { type: 'merge', in: { list: ['haloS2', 'armS', 'hexY', 'hexB', 'hex2B'] } },
    },
    output: 'out',
  },
};

export const flake = LIB.flake;
