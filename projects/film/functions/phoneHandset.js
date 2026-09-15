// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- handset: a telephone handset. A thick bar arching over the cradle with a squarish cup hanging at each end,
// blue with navy halftone on the cup mouths, a wide paper highlight along the top and broken paper echo lines above ----
LIB.phoneHandset = {
  label: 'Telephone handset',
  params: {
    x: Q(540, 0, 1080, 1), y: Q(420, 0, 1080, 1), rot: Q(0, -1, 1, 0.01), scale: Q(1, 0.2, 3, 0.01),
    thick: Q(75, 10, 140, 1, 'bar thickness (px)'), bob: Q(4, 0, 20, 0.5, 'ring bob (px)'),
  },
  xf: { x: '$x', y: '$y + $bob*sin(t*7)', rot: '$rot + 0.012*sin(t*7+1)', scale: '$scale' },
  graph: {
    nodes: {
      // the bar: an arch from the low left cup over the top and down to the right cup
      axis: { type: 'polygon', params: { pts: '-290 50 -210 -20 -110 -65 20 -80 140 -75 220 -60 290 -40', closed: 0 } },
      axisW: { type: 'wrangle', in: { geo: 'axis' }, params: { w: '$thick' } },
      barH: { type: 'hand', in: { geo: 'axisW' }, params: { step: 6, wobble: 1.5, wave: 90, jitter: 0.4, press: 0.15, taper: 0, overshoot: 0 } },
      barS: { type: 'stroke', in: { geo: 'barH' }, params: { ink: 'blue', mode: 'solid' } },
      // cups: chamfered rounded rectangles, mouths facing down and outward, overlapping the bar ends
      cup: { type: 'polygon', params: { pts: '-42 -47 42 -47 60 -29 60 29 42 47 -42 47 -60 29 -60 -29' } },
      cupL: { type: 'transform', in: { geo: 'cup' }, params: { x: -310, y: 80, rot: 0.5 } },
      cupR: { type: 'transform', in: { geo: 'cup' }, params: { x: 300, y: 0, rot: -0.4 } },
      cups: { type: 'merge', in: { list: ['cupL', 'cupR'] } },
      cupsH: { type: 'hand', in: { geo: 'cups' }, params: { step: 5, wobble: 2, wave: 40, jitter: 0.5, press: 0, taper: 0, overshoot: 0 } },
      cupsB: { type: 'fill', in: { geo: 'cupsH' }, params: { ink: 'blue', mode: 'solid' } },
      // navy halftone on the lower half of each cup and the underside of the bar
      shadeBox: { type: 'rect', params: { x: -420, y: -160, w: 840, h: 320 } },
      shadeF: { type: 'field', params: { expr: 'clamp(0.7*lin(@x,@y,-310,80,-330,125) + 0.7*lin(@x,@y,300,0,315,45) + 0.15*(noise(@x,@y,40,4)-0.5))' } },
      shade: { type: 'tint', in: { geo: 'shadeBox', field: 'shadeF' }, params: { ink: 'pink', cell: '$cellPink', angle: '$anglePink*PI/180' } },
      shadeC: { type: 'crop', in: { marks: 'shade', geo: 'cupsH' } },
      barShadeF: { type: 'field', params: { expr: 'clamp(0.45*lin(@x,@y,0,-70,0,-10) + 0.15*(noise(@x,@y,40,5)-0.5))' } },
      barShade: { type: 'tint', in: { geo: 'shadeBox', field: 'barShadeF' }, params: { ink: 'pink', cell: '$cellPink', angle: '$anglePink*PI/180' } },
      barShadeC: { type: 'crop', in: { marks: 'barShade', geo: 'barH' } },
      // paper highlights: the middle of the bar's top edge, and the top edge of each cup
      hiBar: { type: 'polygon', params: { pts: '-190 -56 -110 -100 20 -116 140 -110 200 -96', closed: 0 } },
      hiCup: { type: 'polygon', params: { pts: '-34 -38 34 -38', closed: 0 } },
      hiCupL: { type: 'transform', in: { geo: 'hiCup' }, params: { x: -310, y: 80, rot: 0.5 } },
      hiCupR: { type: 'transform', in: { geo: 'hiCup' }, params: { x: 300, y: 0, rot: -0.4 } },
      hiBarW: { type: 'wrangle', in: { geo: 'hiBar' }, params: { w: 14 } },
      hiCups: { type: 'merge', in: { list: ['hiCupL', 'hiCupR'] } },
      hiCupsW: { type: 'wrangle', in: { geo: 'hiCups' }, params: { w: 8 } },
      hiAll: { type: 'merge', in: { list: ['hiBarW', 'hiCupsW'] } },
      hiH: { type: 'hand', in: { geo: 'hiAll' }, params: { step: 6, wobble: 1.5, wave: 60, jitter: 0.5, press: 0.4, taper: 0.6, overshoot: 0 } },
      hi: { type: 'stroke', in: { geo: 'hiH' }, params: { ink: 'all', mode: 'cut' } },
      // echoes: the arch repeated above the bar, each line in two segments with a gap
      echo: { type: 'copy', params: { n: 2, y: '-$thick/2 - 30 - @i*25', x: '(rand(1)-0.5)*16' }, template: { nodes: {
        a: { type: 'polygon', params: { pts: '-270 40 -210 -20 -110 -65 -10 -78', closed: 0 } },
        b: { type: 'polygon', params: { pts: '60 -80 140 -75 220 -60 280 -42', closed: 0 } },
        ab: { type: 'merge', in: { list: ['a', 'b'] } },
        w: { type: 'wrangle', in: { geo: 'ab' }, params: { w: 4 } } }, output: 'w' } },
      echoH: { type: 'hand', in: { geo: 'echo' }, params: { step: 7, wobble: 2.5, wave: 90, jitter: 0.6, press: 0.5, taper: 0.6, overshoot: 4 } },
      echoS: { type: 'stroke', in: { geo: 'echoH' }, params: { ink: 'all', mode: 'cut' } },
      out: { type: 'merge', in: { list: ['echoS', 'cupsB', 'shadeC', 'barS', 'barShadeC', 'hi'] } },
    },
    output: 'out',
  },
};

export const phoneHandset = LIB.phoneHandset;
