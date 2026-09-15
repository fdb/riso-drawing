// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- whale: a navy whale, nose at the origin, tail at -x. Body and flukes as one silhouette, a hanging
// pectoral fin, paper throat grooves, a pale stripe along the back, an eye, pink flecks; it bobs ----
LIB.whale = {
  label: 'Whale',
  params: {
    x: Q(1015, 0, 1400, 1, 'nose x'), y: Q(650, 0, 1400, 1, 'nose y'), rot: Q(-0.27, -1.5, 1.5, 0.01), scale: Q(1, 0.1, 2, 0.01),
    bob: Q(5, 0, 30, 0.5, 'bob (px)'), grooves: Q(11, 0, 20, 1), flecks: Q(45, 0, 200, 1),
  },
  xf: { x: '$x', y: '$y + $bob*sin(t*0.9)', rot: '$rot + 0.008*sin(t*0.7)', scale: '$scale' },
  graph: {
    nodes: {
      body: { type: 'polygon', params: { pts: '0 -40 -10 -90 -70 -132 -190 -158 -360 -168 -560 -150 -760 -104 -900 -54 -960 -20 -1040 -76 -1085 -48 -1025 4 -1085 60 -1035 92 -960 30 -800 90 -600 140 -400 160 -230 146 -110 112 -40 64 0 16' } },
      bodyH: { type: 'hand', in: { geo: 'body' }, params: { step: 8, wobble: 1.5, wave: 160, jitter: 0.6, press: 0, taper: 0, overshoot: 0 } },
      fin: { type: 'polygon', params: { pts: '-330 130 -400 240 -470 340 -440 358 -350 250 -280 160' } },
      finH: { type: 'hand', in: { geo: 'fin' }, params: { step: 8, wobble: 1.5, wave: 120, jitter: 0.6, press: 0, taper: 0, overshoot: 0 } },
      finW: { type: 'wrangle', in: { geo: 'finH' }, params: { x: '@x + 6*sin(t*1.1)*(@y>150)' } },
      all: { type: 'merge', in: { list: ['bodyH', 'finW'] } },
      allB: { type: 'fill', in: { geo: 'all' }, params: { ink: 'blue', mode: 'solid' } },
      allP: { type: 'fill', in: { geo: 'all' }, params: { ink: 'pink', mode: 'add', tone: 0.85 } },
      // the throat grooves: paper lines parallel to the belly
      grooves: { type: 'copy', params: { n: '$grooves' }, template: { nodes: {
        l: { type: 'line', params: { x0: '-20-@i*9', y0: '18+@i*12', x1: '-520+@i*12', y1: '120+@i*4', n: 12 } },
        w: { type: 'wrangle', in: { geo: 'l' }, params: { y: '@y + 20*sin(@v*PI)', w: '3.2*(1-0.7*pow(abs(@v-0.5)*2,3))' } } }, output: 'w' } },
      groovesH: { type: 'hand', in: { geo: 'grooves' }, params: { step: 6, wobble: 0.8, wave: 100, jitter: 0.3, press: 0.3, taper: 0.5, overshoot: 0 } },
      groovesS: { type: 'stroke', in: { geo: 'groovesH' }, params: { ink: 'all', mode: 'cut' } },
      groovesC: { type: 'crop', in: { marks: ['groovesS'], geo: 'bodyH' } },
      // a pale stripe along the back
      stripe: { type: 'polygon', params: { pts: '-620 -128 -400 -150 -230 -142 -70 -108', closed: 0 } },
      stripeH: { type: 'hand', in: { geo: 'stripe' }, params: { step: 8, wobble: 1, wave: 120, jitter: 0.3, press: 0.5, taper: 0.6, overshoot: 0 } },
      stripeW: { type: 'wrangle', in: { geo: 'stripeH' }, params: { w: '@pw*2.4' } },
      stripeCut: { type: 'stroke', in: { geo: 'stripeW' }, params: { ink: 'all', mode: 'cut' } },
      stripeB: { type: 'stroke', in: { geo: 'stripeW' }, params: { ink: 'blue', mode: 'add', tone: 0.55 } },
      // eye and flecks
      eye: { type: 'point', params: { x: -84, y: -44 } },
      eyeW: { type: 'dots', in: { geo: 'eye' }, params: { ink: 'all', mode: 'cut', r: 6 } },
      eyeB: { type: 'dots', in: { geo: 'eye' }, params: { ink: 'blue', mode: 'add', r: 3 } },
      eyeP: { type: 'dots', in: { geo: 'eye' }, params: { ink: 'pink', mode: 'add', r: 3 } },
      fleckPts: { type: 'scatter', in: { geo: 'body' }, params: { count: '$flecks' } },
      flecksP: { type: 'dots', in: { geo: 'fleckPts' }, params: { ink: 'pink', mode: 'solid', tone: 0.9, r: '(1.5+2.5*rand(1))*(rand(2)<0.7)' } },
      flecksB: { type: 'dots', in: { geo: 'fleckPts' }, params: { ink: 'blue', mode: 'solid', tone: 0.9, r: '(1.5+2*rand(3))*(rand(2)>=0.7)' } },
      out: { type: 'merge', in: { list: ['allB', 'allP', 'groovesC', 'stripeCut', 'stripeB', 'eyeW', 'eyeB', 'eyeP', 'flecksP', 'flecksB'] } },
    },
    output: 'out',
  },
};

export const whale = LIB.whale;
