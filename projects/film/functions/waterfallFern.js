// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- fern: a drooping frond. A stem that bends down under its own weight, lens leaflets on both sides,
// smaller towards the tip; yellow with green (blue over yellow) leaflets; it sways a little ----
LIB.waterfallFern = {
  label: 'Fern frond',
  params: {
    x: Q(0, -200, 1280, 1, 'base x'), y: Q(300, -200, 1280, 1, 'base y'), len: Q(300, 40, 800, 1), rot: Q(0.3, -3.2, 3.2, 0.01, 'heading (rad)'),
    droop: Q(0.6, -2, 2, 0.01, 'bend towards the tip'), leaf: Q(34, 4, 120, 0.5, 'leaflet length'), spread: Q(0.9, 0.2, 1.5, 0.01, 'leaflet angle (rad)'),
    gap: Q(14, 4, 60, 0.5, 'leaflet spacing'), green: Q(0.45, 0, 1, 0.01, 'share of green leaflets'), sway: Q(0.02, 0, 0.2, 0.001),
  },
  xf: { x: '$x', y: '$y', rot: '$rot + $sway*sin(t*1.3 + rand(0)*TAU)' },
  graph: {
    nodes: {
      stem0: { type: 'line', params: { x0: 0, y0: 0, x1: '$len', y1: 0, n: 30 } },
      stem: { type: 'wrangle', in: { geo: 'stem0' }, params: { y: '@y + $droop*$len*@v*@v', w: '3.5*(1-0.7*@v)' } },
      stemH: { type: 'hand', in: { geo: 'stem' }, params: { step: 5, wobble: 1.5, wave: 80, jitter: 0.3, press: 0.3, taper: 0.2, overshoot: 0 } },
      stemY: { type: 'stroke', in: { geo: 'stemH' }, params: { ink: 'yellow', mode: 'solid' } },
      stemB: { type: 'stroke', in: { geo: 'stemH' }, params: { ink: 'blue', mode: 'add', tone: 0.7 } },
      pts: { type: 'resample', in: { geo: 'stem' }, params: { step: '$gap' } },
      leafPts: { type: 'pointsAlong', in: { geo: 'pts' }, params: { start: 1, step: 1, margin: 1 } },
      leaves: { type: 'copy', in: { points: 'leafPts' }, params: { orient: 1 }, template: {
        let: { L: '$leaf*(1-0.65*@v)*(0.85+0.3*rand(1))', W: '$leaf*0.2*(1-0.5*@v)' },
        nodes: {
          up: { type: 'lens', params: { len: '$L/2', wid: '$W', n: 8 } },
          upT: { type: 'transform', in: { geo: 'up' }, params: { x: 'cos(-$spread)*$L/2', y: 'sin(-$spread)*$L/2', rot: '-$spread' } },
          upA: { type: 'attr', in: { geo: 'upT' }, attrs: { g: 'rand(2) < $green ? 1 : 0' } },
          dn: { type: 'lens', params: { len: '$L/2', wid: '$W', n: 8 } },
          dnT: { type: 'transform', in: { geo: 'dn' }, params: { x: 'cos($spread)*$L/2', y: 'sin($spread)*$L/2', rot: '$spread' } },
          dnA: { type: 'attr', in: { geo: 'dnT' }, attrs: { g: 'rand(3) < $green ? 1 : 0' } },
          both: { type: 'merge', in: { list: ['upA', 'dnA'] } },
        }, output: 'both' } },
      leavesY: { type: 'fill', in: { geo: 'leaves' }, params: { ink: 'yellow', mode: 'solid' } },
      greenL: { type: 'filter', in: { geo: 'leaves' }, params: { expr: '@g' } },
      greenB: { type: 'fill', in: { geo: 'greenL' }, params: { ink: 'blue', mode: 'add', tone: 0.6 } },
      yellowL: { type: 'filter', in: { geo: 'leaves' }, params: { expr: '!@g' } },
      yellowB: { type: 'fill', in: { geo: 'yellowL' }, params: { ink: 'blue', mode: 'add', tone: 0.12 } },
      out: { type: 'merge', in: { list: ['stemY', 'stemB', 'leavesY', 'greenB', 'yellowB'] } },
    },
    output: 'out',
  },
};

export const waterfallFern = LIB.waterfallFern;
