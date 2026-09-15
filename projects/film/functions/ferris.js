// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- ferris: a wheel of lights. Navy rim, rings and spokes turn about the hub; cabins hang upright
// from the rim in four colours; an A-frame tower holds it up ----
LIB.ferris = {
  label: 'Ferris wheel',
  params: {
    x: Q(615, 0, 1080, 1), y: Q(412, 0, 1080, 1), r: Q(320, 50, 500, 1), cabins: Q(16, 4, 32, 1), spokes: Q(16, 4, 32, 1),
    spin: Q(0.06, -1, 1, 0.005, 'turn (rad/s)'), tower: Q(570, 0, 800, 1, 'tower height below the hub'), light: Q(3.2, 1, 8, 0.1, 'bulb radius'),
  },
  xf: { x: '$x', y: '$y' },
  graph: {
    let: { ph: '$spin*t' },
    nodes: {
      // rotating parts, built about the origin
      rim: { type: 'circle', params: { x: 0, y: 0, r: '$r', n: 140 } },
      ring2: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.84', n: 120 } },
      hub1: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.3', n: 60 } },
      hub2: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.19', n: 48 } },
      spokeL: { type: 'copy', params: { n: '$spokes', rot: '@i/@n*TAU' }, template: { nodes: {
        l: { type: 'line', params: { x0: '$r*0.19', y0: 0, x1: '$r', y1: 0, n: 16 } } }, output: 'l' } },
      brace: { type: 'copy', params: { n: '$spokes', rot: '@i/@n*TAU + PI/@n' }, template: { nodes: {
        l: { type: 'line', params: { x0: '$r*0.3', y0: 0, x1: '$r*0.84', y1: 0, n: 2 } } }, output: 'l' } },
      frame: { type: 'merge', in: { list: ['rim', 'ring2', 'hub1', 'hub2', 'spokeL', 'brace'] } },
      frameR: { type: 'transform', in: { geo: 'frame' }, params: { rot: '$ph' } },
      frameH: { type: 'hand', in: { geo: 'frameR' }, params: { step: 7, wobble: 1.2, wave: 90, jitter: 0.4, press: 0.3, taper: 0, overshoot: 0 } },
      frameW: { type: 'wrangle', in: { geo: 'frameH' }, params: { w: '@pw*2.6' } },
      frameB: { type: 'stroke', in: { geo: 'frameW' }, params: { ink: 'blue', mode: 'solid' } },
      frameP: { type: 'stroke', in: { geo: 'frameW' }, params: { ink: 'pink', mode: 'add' } },
      rimW: { type: 'wrangle', in: { geo: 'rim' }, params: { w: 9 } },
      rimB: { type: 'stroke', in: { geo: 'rimW' }, params: { ink: 'blue', mode: 'solid' } },
      rimP: { type: 'stroke', in: { geo: 'rimW' }, params: { ink: 'pink', mode: 'add' } },
      // bulbs: on the rim, the second ring, the hubs and along the spokes
      lightRing: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.955', n: 96 } },
      lightRing2: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.80', n: 72 } },
      lightHub: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.26', n: 30 } },
      lightHub2: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.15', n: 18 } },
      spokeP: { type: 'slice', in: { geo: 'spokeL' }, params: { start: 1, end: 15 } },
      bulbs: { type: 'merge', in: { list: ['lightRing', 'lightRing2', 'lightHub', 'lightHub2', 'spokeP'] } },
      bulbsR: { type: 'transform', in: { geo: 'bulbs' }, params: { rot: '$ph' } },
      bulbY: { type: 'dots', in: { geo: 'bulbsR' }, params: { ink: 'yellow', mode: 'solid', r: '$light*(0.8+0.5*rand(1))*(0.85+0.15*sin(t*6+@i*1.3))' } },
      bulbW: { type: 'dots', in: { geo: 'bulbsR' }, params: { ink: 'all', mode: 'cut', r: '$light*0.5*(0.7+0.6*rand(2))' } },
      hubDisc: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.035', n: 24 } },
      hubY: { type: 'fill', in: { geo: 'hubDisc' }, params: { ink: 'yellow', mode: 'solid' } },
      // cabins hang upright from the rim
      cab: { type: 'copy', params: { n: '$cabins', x: 'cos($a)*$r', y: 'sin($a)*$r' }, template: {
        let: { a: '@i/@n*TAU + $ph', s: '$r/280' },
        nodes: {
          hook: { type: 'line', params: { x0: 0, y0: 0, x1: 0, y1: '16*$s', n: 2 } },
          hookA: { type: 'attr', in: { geo: 'hook' }, attrs: { part: 0 } },
          body: { type: 'ellipse', params: { x: 0, y: '34*$s', rx: '22*$s', ry: '19*$s', n: 20 } },
          bodyA: { type: 'attr', in: { geo: 'body' }, attrs: { part: 1, c: 'floor(rand(5)*4)' } },
          roof: { type: 'polygon', params: { pts: '-14 14 -6 8 6 8 14 14', closed: 0 } },
          roofT: { type: 'transform', in: { geo: 'roof' }, params: { sx: '$s', sy: '$s' } },
          roofA: { type: 'attr', in: { geo: 'roofT' }, attrs: { part: 2 } },
          win: { type: 'rect', params: { x: '-13*$s', y: '28*$s', w: '26*$s', h: '10*$s' } },
          winA: { type: 'attr', in: { geo: 'win' }, attrs: { part: 3 } },
          all: { type: 'merge', in: { list: ['hookA', 'bodyA', 'roofA', 'winA'] } },
        }, output: 'all' } },
      cabHook: { type: 'filter', in: { geo: 'cab' }, params: { expr: '@part==0 || @part==2' } },
      cabHookB: { type: 'stroke', in: { geo: 'cabHook' }, params: { ink: 'blue', mode: 'solid', w: 3 } },
      cabHookP: { type: 'stroke', in: { geo: 'cabHook' }, params: { ink: 'pink', mode: 'add', w: 3 } },
      cab0: { type: 'filter', in: { geo: 'cab' }, params: { expr: '@part==1 && @c==0' } },
      cab0Y: { type: 'fill', in: { geo: 'cab0' }, params: { ink: 'yellow', mode: 'solid' } },
      cab0B: { type: 'fill', in: { geo: 'cab0' }, params: { ink: 'blue', mode: 'add', tone: 0.45 } },
      cab1: { type: 'filter', in: { geo: 'cab' }, params: { expr: '@part==1 && @c==1' } },
      cab1B: { type: 'fill', in: { geo: 'cab1' }, params: { ink: 'blue', mode: 'solid' } },
      cab2: { type: 'filter', in: { geo: 'cab' }, params: { expr: '@part==1 && @c==2' } },
      cab2P: { type: 'fill', in: { geo: 'cab2' }, params: { ink: 'pink', mode: 'solid', tone: 0.75 } },
      cab2B: { type: 'fill', in: { geo: 'cab2' }, params: { ink: 'blue', mode: 'add', tone: 0.35 } },
      cab3: { type: 'filter', in: { geo: 'cab' }, params: { expr: '@part==1 && @c==3' } },
      cab3P: { type: 'fill', in: { geo: 'cab3' }, params: { ink: 'pink', mode: 'solid' } },
      cab3Y: { type: 'fill', in: { geo: 'cab3' }, params: { ink: 'yellow', mode: 'add', tone: 0.9 } },
      cabWin: { type: 'filter', in: { geo: 'cab' }, params: { expr: '@part==3' } },
      cabWinW: { type: 'fill', in: { geo: 'cabWin' }, params: { ink: 'all', mode: 'cut' } },
      // tower: two legs and braces, navy
      legL: { type: 'polygon', params: { pts: '-12 0 12 0 -108 $tower -140 $tower' } },
      legR: { type: 'polygon', params: { pts: '-12 0 12 0 140 $tower 108 $tower' } },
      braces: { type: 'polygon', params: { pts: '-56 300 56 300 -84 460 84 460 -56 300 -84 460 -122 $tower 122 $tower 84 460 56 300', closed: 0 } },
      base: { type: 'polygon', params: { pts: '-150 $tower 150 $tower', closed: 0 } },
      towerLines: { type: 'merge', in: { list: ['braces', 'base'] } },
      legs: { type: 'merge', in: { list: ['legL', 'legR'] } },
      legsB: { type: 'fill', in: { geo: 'legs' }, params: { ink: 'blue', mode: 'solid' } },
      legsP: { type: 'fill', in: { geo: 'legs' }, params: { ink: 'pink', mode: 'add' } },
      towerB: { type: 'stroke', in: { geo: 'towerLines' }, params: { ink: 'blue', mode: 'solid', w: 6 } },
      towerP: { type: 'stroke', in: { geo: 'towerLines' }, params: { ink: 'pink', mode: 'add', w: 6 } },
      out: { type: 'merge', in: { list: ['legsB', 'legsP', 'towerB', 'towerP', 'frameB', 'frameP', 'rimB', 'rimP', 'bulbY', 'bulbW', 'hubY',
        'cabHookB', 'cabHookP', 'cab0Y', 'cab0B', 'cab1B', 'cab2P', 'cab2B', 'cab3P', 'cab3Y', 'cabWinW'] } },
    },
    output: 'out',
  },
};

export const ferris = LIB.ferris;
