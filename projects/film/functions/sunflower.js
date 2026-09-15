// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- sunflower: two rows of yellow petals with green edges round a red-brown disc of spiralling seeds ----
LIB.sunflower = {
  label: 'Sunflower',
  params: {
    x: Q(300, 0, 1080, 1), y: Q(300, 0, 1080, 1), r: Q(100, 10, 300, 1, 'disc radius'), rot: Q(0, -3.2, 3.2, 0.01),
    petals: Q(22, 5, 60, 1), seeds: Q(260, 20, 800, 1), sway: Q(0.02, 0, 0.2, 0.005, 'rotation sway (rad)'), seed: Q(0, 0, 99, 1),
  },
  xf: { x: '$x', y: '$y', rot: '$rot + $sway*sin(t*1.3+$seed)' },
  graph: {
    nodes: {
      // petals: a lens moved out to the rim, copied round; the back row is smaller and turned half a step
      back: { type: 'copy', params: { n: '$petals', rot: '(@i+0.5)/@n*TAU + (rand(1)-0.5)*0.12', scale: '0.78+0.2*rand(2)' }, template: { nodes: {
        p: { type: 'lens', params: { len: '$r*0.5', wid: '$r*0.3', n: 14 } },
        m: { type: 'transform', in: { geo: 'p' }, params: { x: '$r*1.36' } } }, output: 'm' } },
      front: { type: 'copy', params: { n: '$petals', rot: '@i/@n*TAU + (rand(1)-0.5)*0.12', scale: '0.9+0.25*rand(2)' }, template: { nodes: {
        p: { type: 'lens', params: { len: '$r*0.52', wid: '$r*0.3', n: 14 } },
        m: { type: 'transform', in: { geo: 'p' }, params: { x: '$r*1.38' } } }, output: 'm' } },
      allPetals: { type: 'merge', in: { list: ['back', 'front'] } },
      petalsH: { type: 'hand', in: { geo: 'allPetals' }, params: { step: 5, wobble: '$r*0.012', wave: 40, jitter: 0.5, press: 0.4, taper: 0, overshoot: 0, seed: '$seed' } },
      petalsY: { type: 'fill', in: { geo: 'petalsH' }, params: { ink: 'yellow', mode: 'solid' } },
      petalsW: { type: 'wrangle', in: { geo: 'petalsH' }, params: { w: '$r*0.022' } },
      petalsS: { type: 'stroke', in: { geo: 'petalsW' }, params: { ink: 'blue', mode: 'add', tone: 0.9 } },
      // the disc: orange, browned by a blue tint that deepens outward, then the seed spiral
      disc: { type: 'circle', params: { x: 0, y: 0, r: '$r', n: 60 } },
      discH: { type: 'hand', in: { geo: 'disc' }, params: { step: 5, wobble: '$r*0.015', wave: 50, jitter: 0.5, press: 0, taper: 0, overshoot: 0, seed: '$seed+1' } },
      discP: { type: 'fill', in: { geo: 'discH' }, params: { ink: 'pink', mode: 'solid' } },
      discY: { type: 'fill', in: { geo: 'discH' }, params: { ink: 'yellow', mode: 'add', tone: 0.85 } },
      discFB: { type: 'field', params: { expr: 'clamp(0.08 + 0.42*(1-radial(@x,@y,0,0,$r*1.1)))' } },
      discB: { type: 'tint', in: { geo: 'discH', field: 'discFB' }, params: { ink: 'blue', cell: '$cellBlue', angle: 0.26 } },
      seedPts: { type: 'copy', params: { n: '$seeds', x: 'sqrt(@i/@n)*$r*0.94*cos(@i*2.39996)', y: 'sqrt(@i/@n)*$r*0.94*sin(@i*2.39996)' }, template: { nodes: { p: { type: 'point', params: { x: 0, y: 0 } } }, output: 'p' } },
      seedsB: { type: 'dots', in: { geo: 'seedPts' }, params: { ink: 'blue', mode: 'add', tone: 0.9, r: '$r*(0.014 + 0.03*dist(@x,@y,0,0)/$r)' } },
      seedsP: { type: 'dots', in: { geo: 'seedPts' }, params: { ink: 'pink', mode: 'add', r: '$r*(0.01 + 0.025*dist(@x,@y,0,0)/$r)' } },
      centre: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.2', n: 24 } },
      centreCut: { type: 'fill', in: { geo: 'centre' }, params: { ink: 'pink', mode: 'cut' } },
      centreB: { type: 'fill', in: { geo: 'centre' }, params: { ink: 'blue', mode: 'add', tone: 0.75 } },
      out: { type: 'merge', in: { list: ['petalsY', 'petalsS', 'discP', 'discY', 'discB', 'seedsB', 'seedsP', 'centreCut', 'centreB'] } },
    },
    output: 'out',
  },
};

export const sunflower = LIB.sunflower;
