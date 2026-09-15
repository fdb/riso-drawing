// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- vinyl: a record from above. Offset shadow, paper rim, black disc, grooves, two spinning light wedges, a label ----
LIB.vinyl = {
  label: 'Vinyl record',
  params: {
    x: Q(445, 0, 1080, 1), y: Q(590, 0, 1080, 1), r: Q(445, 50, 600, 1), spin: Q(0, -20, 20, 0.01, 'wedge angle (rad)'),
    grooves: Q(8, 0, 30, 1), label: Q(150, 20, 300, 1, 'label radius'), rim: Q(30, 0, 60, 1, 'paper rim (px)'), shadow: Q(18, 0, 40, 1, 'offset shadow (px)'),
  },
  xf: { x: '$x', y: '$y' },
  graph: {
    let: { R: '$r - $rim', a0: '-0.85 + $spin' },
    nodes: {
      shadowC: { type: 'circle', params: { x: '$shadow', y: '$shadow*0.8', r: '$r', n: 120 } },
      shadowP: { type: 'fill', in: { geo: 'shadowC' }, params: { ink: 'pink', mode: 'add' } },
      shadowY: { type: 'fill', in: { geo: 'shadowC' }, params: { ink: 'yellow', mode: 'add' } },
      rimC: { type: 'circle', params: { x: 0, y: 0, r: '$r', n: 120 } },
      rimH: { type: 'hand', in: { geo: 'rimC' }, params: { step: 8, wobble: 2, wave: 120, jitter: 0.4, press: 0, taper: 0, overshoot: 0 } },
      rimCut: { type: 'fill', in: { geo: 'rimH' }, params: { ink: 'all', mode: 'cut' } },
      rimF: { type: 'field', params: { expr: '0.28 + 0.1*noise(@x,@y,30,4)' } },
      rimDots: { type: 'tint', in: { geo: 'rimH', field: 'rimF' }, params: { ink: 'blue', cell: 4.5, angle: 0.3 } },
      rimEdgeB: { type: 'stroke', in: { geo: 'rimH' }, params: { ink: 'blue', mode: 'add', w: 3 } },
      rimEdgeP: { type: 'stroke', in: { geo: 'rimH' }, params: { ink: 'pink', mode: 'add', w: 3 } },
      disc: { type: 'circle', params: { x: 0, y: 0, r: '$R', n: 120 } },
      discH: { type: 'hand', in: { geo: 'disc' }, params: { step: 8, wobble: 1.5, wave: 100, jitter: 0.3, press: 0, taper: 0, overshoot: 0 } },
      discFB: { type: 'field', params: { expr: 'clamp(1 - 0.32*pow(max(0, sin(dist(@x,@y,0,0)/$R*PI*3.2+0.6)), 3) + 0.06*(noise(@x,@y,40,3)-0.5))' } },
      discB: { type: 'tint', in: { geo: 'discH', field: 'discFB' }, params: { ink: 'blue', cell: 5.6, angle: 0.26 } },
      discFP: { type: 'field', params: { expr: 'clamp(0.92 - 0.45*pow(max(0, sin(dist(@x,@y,0,0)/$R*PI*3.2+0.6)), 3) + 0.06*(noise(@x,@y,40,3)-0.5))' } },
      discP: { type: 'tint', in: { geo: 'discH', field: 'discFP' }, params: { ink: 'pink', cell: 5.2, angle: 0.8 } },
      discY: { type: 'fill', in: { geo: 'discH' }, params: { ink: 'yellow', mode: 'add' } },
      // light wedges: pink and blue knocked out, then a thinner blue and a trace of pink tinted back in
      wedge: { type: 'copy', params: { n: 2, rot: '@i*PI' }, template: { nodes: {
        w: { type: 'polygon', params: { pts: '0 0 cos($a0-0.22)*$R*1.02 sin($a0-0.22)*$R*1.02 cos($a0-0.1)*$R*1.02 sin($a0-0.1)*$R*1.02 cos($a0)*$R*1.02 sin($a0)*$R*1.02 cos($a0+0.1)*$R*1.02 sin($a0+0.1)*$R*1.02 cos($a0+0.22)*$R*1.02 sin($a0+0.22)*$R*1.02' } } }, output: 'w' } },
      wedgeIn: { type: 'crop', in: { marks: 'wedgeCut', geo: 'discH' } },
      wedgeCut: { type: 'fill', in: { geo: 'wedge' }, params: { ink: 'blue', mode: 'cut' } },
      wedgeCutP: { type: 'fill', in: { geo: 'wedge' }, params: { ink: 'pink', mode: 'cut' } },
      wedgeInP: { type: 'crop', in: { marks: 'wedgeCutP', geo: 'discH' } },
      wedgeFB: { type: 'field', params: { expr: 'clamp(0.36 + 0.14*(noise(@x,@y,25,5)-0.5) + 0.15*noise(@x,@y,6,7))' } },
      wedgeTB: { type: 'tint', in: { geo: 'wedge', field: 'wedgeFB' }, params: { ink: 'blue', cell: 5.6, angle: 0.26 } },
      wedgeInB: { type: 'crop', in: { marks: 'wedgeTB', geo: 'discH' } },
      wedgeFP: { type: 'field', params: { expr: 'clamp(0.28 + 0.2*(noise(@x,@y,20,6)-0.5))' } },
      wedgeTP: { type: 'tint', in: { geo: 'wedge', field: 'wedgeFP' }, params: { ink: 'pink', cell: 5.2, angle: 0.8 } },
      wedgeInPk: { type: 'crop', in: { marks: 'wedgeTP', geo: 'discH' } },
      // radial streaks inside the wedges
      streaks: { type: 'copy', params: { n: 2, rot: '@i*PI' }, template: { nodes: {
        ry: { type: 'rays', params: { x: 0, y: 0, a0: '($a0-0.18)*180/PI', a1: '($a0+0.18)*180/PI', count: 9, r0: '$label*1.3', r1: '$R*0.98' } },
        rh: { type: 'hand', in: { geo: 'ry' }, params: { step: 6, wobble: 1.2, wave: 60, jitter: 0.3, press: 0.5, taper: 0.6, overshoot: 0 } } }, output: 'rh' } },
      streaksB: { type: 'stroke', in: { geo: 'streaks' }, params: { ink: 'blue', mode: 'cut', w: 2.6 } },
      streaksP: { type: 'stroke', in: { geo: 'streaks' }, params: { ink: 'pink', mode: 'cut', w: 2.6 } },
      // grooves: thin cuts in the blue, so they print orange on the black
      grooves: { type: 'copy', params: { n: '$grooves' }, template: { nodes: {
        c: { type: 'circle', params: { x: 0, y: 0, r: '$label*1.25 + ($R*0.93-$label*1.25)*(@i+0.5)/@n + (rand(1)-0.5)*16', n: 140 } },
        h: { type: 'hand', in: { geo: 'c' }, params: { step: 8, wobble: 1.5, wave: 140, jitter: 0.4, press: 0.6, taper: 0, overshoot: 0 } } }, output: 'h' } },
      groovesW: { type: 'wrangle', in: { geo: 'grooves' }, params: { w: '1 + 0.9*rand(2)' } },
      groovesS: { type: 'stroke', in: { geo: 'groovesW' }, params: { ink: 'blue', mode: 'cut' } },
      groovesS2: { type: 'stroke', in: { geo: 'groovesW' }, params: { ink: 'pink', mode: 'cut', w: 0.6 } },
      // label: pink, an orange ring, a yellow centre, a paper spindle hole
      lab: { type: 'circle', params: { x: 0, y: 0, r: '$label', n: 96 } },
      labH: { type: 'hand', in: { geo: 'lab' }, params: { step: 7, wobble: 1.5, wave: 90, jitter: 0.4, press: 0, taper: 0, overshoot: 0 } },
      labP: { type: 'fill', in: { geo: 'labH' }, params: { ink: 'pink', mode: 'solid' } },
      labEdge: { type: 'stroke', in: { geo: 'labH' }, params: { ink: 'blue', mode: 'add', w: 3 } },
      ring: { type: 'circle', params: { x: 0, y: 0, r: '$label*0.73', n: 96 } },
      ringY: { type: 'fill', in: { geo: 'ring' }, params: { ink: 'yellow', mode: 'add', tone: 0.9 } },
      core: { type: 'circle', params: { x: 0, y: 0, r: '$label*0.44', n: 96 } },
      coreH: { type: 'hand', in: { geo: 'core' }, params: { step: 6, wobble: 1, wave: 60, jitter: 0.3, press: 0, taper: 0, overshoot: 0 } },
      coreY: { type: 'fill', in: { geo: 'coreH' }, params: { ink: 'yellow', mode: 'solid' } },
      hole: { type: 'circle', params: { x: 0, y: 0, r: '$label*0.08', n: 32 } },
      holeC: { type: 'fill', in: { geo: 'hole' }, params: { ink: 'all', mode: 'cut' } },
      holeS: { type: 'stroke', in: { geo: 'hole' }, params: { ink: 'blue', mode: 'add', w: 3 } },
      // dark dashes on the label
      dashA: { type: 'ellipse', params: { x: 0, y: 0, rx: '$label*0.86', ry: '$label*0.86', a0: 145, a1: 205, n: 18 } },
      dashB: { type: 'ellipse', params: { x: 0, y: 0, rx: '$label*0.86', ry: '$label*0.86', a0: 85, a1: 135, n: 14 } },
      dashC: { type: 'ellipse', params: { x: 0, y: 0, rx: '$label*0.66', ry: '$label*0.66', a0: 195, a1: 255, n: 16 } },
      dashD: { type: 'ellipse', params: { x: 0, y: 0, rx: '$label*0.66', ry: '$label*0.66', a0: 25, a1: 85, n: 16 } },
      dashE: { type: 'ellipse', params: { x: 0, y: 0, rx: '$label*0.66', ry: '$label*0.66', a0: 110, a1: 150, n: 12 } },
      thin: { type: 'merge', in: { list: ['dashA', 'dashB'] } },
      thinH: { type: 'hand', in: { geo: 'thin' }, params: { step: 5, wobble: 1, wave: 50, jitter: 0.3, press: 0.4, taper: 0.5, overshoot: 2 } },
      thinS: { type: 'stroke', in: { geo: 'thinH' }, params: { ink: 'blue', mode: 'add', w: 3.5 } },
      thick: { type: 'merge', in: { list: ['dashC', 'dashD', 'dashE'] } },
      thickH: { type: 'hand', in: { geo: 'thick' }, params: { step: 5, wobble: 1, wave: 50, jitter: 0.3, press: 0.5, taper: 0.7, overshoot: 2 } },
      thickW: { type: 'wrangle', in: { geo: 'thickH' }, params: { w: '@pw*5' } },
      thickB: { type: 'stroke', in: { geo: 'thickW' }, params: { ink: 'blue', mode: 'add' } },
      thickP: { type: 'stroke', in: { geo: 'thickW' }, params: { ink: 'pink', mode: 'add' } },
      thickY: { type: 'stroke', in: { geo: 'thickW' }, params: { ink: 'yellow', mode: 'add' } },
      out: { type: 'merge', in: { list: ['shadowP', 'shadowY', 'rimCut', 'rimDots', 'rimEdgeB', 'rimEdgeP', 'discB', 'discP', 'discY', 'wedgeIn', 'wedgeInP', 'wedgeInB', 'wedgeInPk', 'streaksB', 'streaksP', 'groovesS', 'groovesS2', 'labP', 'labEdge', 'ringY', 'coreY', 'holeC', 'holeS', 'thinS', 'thickB', 'thickP', 'thickY'] } },
    },
    output: 'out',
  },
};

export const vinyl = LIB.vinyl;
