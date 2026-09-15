// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- wheel: a bicycle wheel. Tyre, rim, thin spokes from a hub, drawn with a pencil; it can turn ----
LIB.bicycleWheel = {
  label: 'Bicycle wheel',
  params: {
    x: Q(290, 0, 1080, 1), y: Q(775, 0, 1080, 1), r: Q(170, 20, 400, 1), spokes: Q(28, 6, 60, 1), tyre: Q(9, 1, 30, 0.5, 'tyre width'),
    ink: { def: 'blue', kind: 'ink' }, mode: { def: 'solid', kind: 'mode' }, spin: Q(0, -3, 3, 0.01, 'turn (rad/s)'), dark: Q(0, 0, 1, 0.01, 'pink over the tyre (navy)'),
  },
  xf: { x: '$x', y: '$y' },
  graph: {
    nodes: {
      tyre: { type: 'circle', params: { x: 0, y: 0, r: '$r', n: 120 } },
      tyreH: { type: 'hand', in: { geo: 'tyre' }, params: { step: 7, wobble: 1.5, wave: 140, jitter: 0.4, press: 0.35, taper: 0, overshoot: 0 } },
      tyreW: { type: 'wrangle', in: { geo: 'tyreH' }, params: { w: '@pw*$tyre/2' } },
      tyreS: { type: 'stroke', in: { geo: 'tyreW' }, params: { ink: '$ink', mode: '$mode' } },
      tyreP: { type: 'stroke', in: { geo: 'tyreW' }, params: { ink: 'pink', mode: 'add', tone: '$dark' }, when: '$dark > 0' },
      rim: { type: 'circle', params: { x: 0, y: 0, r: '$r-$tyre*1.4', n: 120 } },
      rimH: { type: 'hand', in: { geo: 'rim' }, params: { step: 7, wobble: 1, wave: 140, jitter: 0.3, press: 0.3, taper: 0, overshoot: 0 } },
      rimW: { type: 'wrangle', in: { geo: 'rimH' }, params: { w: '@pw*$tyre/6' } },
      rimS: { type: 'stroke', in: { geo: 'rimW' }, params: { ink: '$ink', mode: '$mode' } },
      spokes: { type: 'copy', params: { n: '$spokes', rot: '@i/@n*TAU + $spin*t + (rand(1)-0.5)*0.03' }, template: { nodes: {
        l: { type: 'line', params: { x0: '$r*0.07', y0: '(rand(2)-0.5)*$r*0.05', x1: '$r*0.92', y1: '(rand(3)-0.5)*$r*0.04', n: 2 } } }, output: 'l' } },
      spokesH: { type: 'hand', in: { geo: 'spokes' }, params: { step: 8, wobble: 0.6, wave: 100, jitter: 0.3, press: 0.3, taper: 0, overshoot: 1 } },
      spokesW: { type: 'wrangle', in: { geo: 'spokesH' }, params: { w: '@pw*$tyre/11' } },
      spokesS: { type: 'stroke', in: { geo: 'spokesW' }, params: { ink: '$ink', mode: '$mode' } },
      hub: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.075', n: 24 } },
      hubS: { type: 'fill', in: { geo: 'hub' }, params: { ink: '$ink', mode: '$mode' } },
      out: { type: 'merge', in: { list: ['spokesS', 'rimS', 'tyreS', 'tyreP', 'hubS'] } },
    },
    output: 'out',
  },
};

export const bicycleWheel = LIB.bicycleWheel;
