// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- dial: a rotary telephone dial. A yellow ring, a blue disc, paper finger holes with pink pins on an arc,
// a paper centre with a pink pin ----
LIB.phoneDial = {
  label: 'Rotary dial',
  params: {
    x: Q(540, 0, 1080, 1), y: Q(780, 0, 1080, 1), r: Q(150, 20, 400, 1), holes: Q(10, 1, 12, 1),
    a0: Q(174, -360, 360, 1, 'first hole angle (deg)'), span: Q(244, 0, 360, 1, 'holes arc (deg)'),
  },
  xf: { x: '$x', y: '$y' },
  graph: {
    nodes: {
      ring: { type: 'circle', params: { x: 0, y: 0, r: '$r', n: 120 } },
      ringW: { type: 'wrangle', in: { geo: 'ring' }, params: { w: '$r*0.06' } },
      ringH: { type: 'hand', in: { geo: 'ringW' }, params: { step: 6, wobble: 1.5, wave: 80, jitter: 0.4, press: 0.3, taper: 0, overshoot: 0 } },
      ringS: { type: 'stroke', in: { geo: 'ringH' }, params: { ink: 'yellow', mode: 'solid' } },
      disc: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.95', n: 90 } },
      discB: { type: 'fill', in: { geo: 'disc' }, params: { ink: 'blue', mode: 'solid' } },
      holes: { type: 'copy', params: { n: '$holes', rot: '($a0 + @i*$span/max(1,$holes-1))*PI/180' }, template: { nodes: {
        h: { type: 'circle', params: { x: '$r*0.68', y: 0, r: '$r*(0.14 + 0.02*rand(1))', n: 32 } } }, output: 'h' } },
      holesH: { type: 'hand', in: { geo: 'holes' }, params: { step: 5, wobble: 1, wave: 30, jitter: 0.4, press: 0, taper: 0, overshoot: 0 } },
      holesW: { type: 'fill', in: { geo: 'holesH' }, params: { ink: 'all', mode: 'cut' } },
      pins: { type: 'copy', params: { n: '$holes', rot: '($a0 + @i*$span/max(1,$holes-1))*PI/180' }, template: { nodes: {
        p: { type: 'circle', params: { x: '$r*0.68 + (rand(2)-0.5)*4', y: '(rand(3)-0.5)*4', r: '$r*0.045', n: 20 } } }, output: 'p' } },
      pinsP: { type: 'fill', in: { geo: 'pins' }, params: { ink: 'pink', mode: 'solid' } },
      centre: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.3', n: 48 } },
      centreH: { type: 'hand', in: { geo: 'centre' }, params: { step: 5, wobble: 1.2, wave: 40, jitter: 0.4, press: 0, taper: 0, overshoot: 0 } },
      centreW: { type: 'fill', in: { geo: 'centreH' }, params: { ink: 'all', mode: 'cut' } },
      pin: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.1', n: 24 } },
      pinP: { type: 'fill', in: { geo: 'pin' }, params: { ink: 'pink', mode: 'solid' } },
      out: { type: 'merge', in: { list: ['discB', 'ringS', 'holesW', 'pinsP', 'centreW', 'pinP'] } },
    },
    output: 'out',
  },
};

export const phoneDial = LIB.phoneDial;
