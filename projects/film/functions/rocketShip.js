// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- rocket: a paper-white body with a pink nose and bands, navy fins, and a flickering
// yellow exhaust with orange edges. Local coordinates: half width 45, nose at y -232, exhaust to y 575 ----
LIB.rocketShip = {
  label: 'Rocket',
  params: { x: Q(445, 0, 1080, 1), y: Q(270, 0, 1080, 1), scale: Q(1, 0.2, 3, 0.01), sway: Q(3, 0, 20, 0.1), flame: Q(1, 0, 1, 0.01, 'exhaust length') },
  xf: { x: '$x + $sway*sin(t*1.7)', y: '$y + $sway*0.7*sin(t*2.3)', scale: '$scale' },
  graph: {
    nodes: {
      // exhaust first: it sits under the nozzle
      core: { type: 'polygon', params: { pts: '-40 240 40 240 42 330 45 430 43 530 30 565 0 575 -30 565 -43 530 -45 430 -42 330' } },
      coreW: { type: 'wrangle', in: { geo: 'core' }, params: { x: '@x + 4*sin(@y*0.05 + t*12)*(@y>260)', y: '@y > 300 ? 300 + (@y-300)*$flame*(1+0.06*sin(t*17)) : @y' } },
      coreY: { type: 'fill', in: { geo: 'coreW' }, params: { ink: 'yellow', mode: 'solid' } },
      edgeL: { type: 'polygon', params: { pts: '-32 260 -34 330 -37 430 -35 530 -22 560', closed: 0 } },
      edgeR: { type: 'polygon', params: { pts: '32 260 34 330 37 430 35 530 22 560', closed: 0 } },
      edges: { type: 'merge', in: { list: ['edgeL', 'edgeR'] } },
      edgesW: { type: 'wrangle', in: { geo: 'edges' }, params: { x: '@x + 4*sin(@y*0.05 + t*12)', y: '@y > 300 ? 300 + (@y-300)*$flame*(1+0.06*sin(t*17)) : @y', w: '14 + 4*sin(@y*0.08 + t*9)' } },
      edgesH: { type: 'hand', in: { geo: 'edgesW' }, params: { step: 5, wobble: 3, wave: 40, jitter: 0.8, press: 0.5, taper: 0.3, overshoot: 0 } },
      edgesP: { type: 'stroke', in: { geo: 'edgesH' }, params: { ink: 'pink', mode: 'add' } },
      streak: { type: 'polygon', params: { pts: '-7 250 7 250 5 400 8 520 0 545 -8 520 -5 400' } },
      streakW: { type: 'wrangle', in: { geo: 'streak' }, params: { x: '@x + 3*sin(@y*0.07 + t*11)', y: '@y > 300 ? 300 + (@y-300)*$flame*(1+0.06*sin(t*17)) : @y' } },
      streakC: { type: 'fill', in: { geo: 'streakW' }, params: { ink: 'all', mode: 'cut' } },
      // body
      body: { type: 'polygon', params: { pts: '0 -232 17 -218 33 -185 43 -140 45 -70 45 230 -45 230 -45 -70 -43 -140 -33 -185 -17 -218' } },
      bodyC: { type: 'fill', in: { geo: 'body' }, params: { ink: 'all', mode: 'cut' } },
      shadeF: { type: 'field', params: { expr: 'clamp(0.75*lin(@x,@y,-5,0,48,0))' } },
      shade: { type: 'tint', in: { geo: 'body', field: 'shadeF' }, params: { ink: 'blue', cell: '$cellBlue', angle: '$angleBlue*PI/180' } },
      nose: { type: 'polygon', params: { pts: '0 -232 17 -218 33 -185 40 -152 -40 -152 -33 -185 -17 -218' } },
      noseP: { type: 'fill', in: { geo: 'nose' }, params: { ink: 'pink', mode: 'solid' } },
      band1: { type: 'rect', params: { x: -44, y: -40, w: 88, h: 15 } },
      band2: { type: 'rect', params: { x: -44, y: 100, w: 88, h: 11 } },
      winP1: { type: 'rect', params: { x: -42, y: 66, w: 20, h: 12 } },
      winP2: { type: 'rect', params: { x: 18, y: 66, w: 24, h: 12 } },
      pinks: { type: 'merge', in: { list: ['band1', 'band2', 'winP1', 'winP2'] } },
      pinksP: { type: 'fill', in: { geo: 'pinks' }, params: { ink: 'pink', mode: 'solid' } },
      winB1: { type: 'rect', params: { x: -42, y: 45, w: 20, h: 15 } },
      winB2: { type: 'rect', params: { x: 18, y: 45, w: 24, h: 15 } },
      blues: { type: 'merge', in: { list: ['winB1', 'winB2'] } },
      bluesB: { type: 'fill', in: { geo: 'blues' }, params: { ink: 'blue', mode: 'solid' } },
      port: { type: 'circle', params: { x: 0, y: -85, r: 9, n: 24 } },
      portS: { type: 'stroke', in: { geo: 'port' }, params: { ink: 'blue', mode: 'add', w: 2.5 } },
      finL: { type: 'polygon', params: { pts: '-45 115 -93 232 -93 256 -45 236' } },
      finR: { type: 'polygon', params: { pts: '45 115 93 232 93 256 45 236' } },
      nozzle: { type: 'rect', params: { x: -25, y: 228, w: 50, h: 20 } },
      dark: { type: 'merge', in: { list: ['finL', 'finR', 'nozzle'] } },
      darkB: { type: 'fill', in: { geo: 'dark' }, params: { ink: 'blue', mode: 'solid' } },
      darkP: { type: 'fill', in: { geo: 'dark' }, params: { ink: 'pink', mode: 'add' } },
      out: { type: 'merge', in: { list: ['coreY', 'edgesP', 'streakC', 'bodyC', 'shade', 'noseP', 'pinksP', 'bluesB', 'portS', 'darkB', 'darkP'] } },
    },
    output: 'out',
  },
};

export const rocketShip = LIB.rocketShip;
