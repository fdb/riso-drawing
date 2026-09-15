// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- tent: a striped fairground tent. A paper dome with pink wedges from the apex, a scalloped eave,
// striped walls below, and a string of bulbs along the eave ----
LIB.ferrisTent = {
  label: 'Striped tent',
  params: {
    x: Q(160, 0, 1080, 1, 'apex x'), y: Q(690, 0, 1080, 1, 'apex y'), w: Q(190, 20, 500, 1, 'half width'), h: Q(140, 10, 400, 1, 'dome height'),
    bottom: Q(1080, 0, 1200, 1), stripes: Q(9, 3, 30, 1), flag: Q(1, 0, 1, 1),
  },
  xf: { x: '$x', y: '$y' },
  graph: {
    nodes: {
      dome: { type: 'ellipse', params: { x: 0, y: '$h', rx: '$w', ry: '$h', a0: 180, a1: 360, n: 40 } },
      domeH: { type: 'hand', in: { geo: 'dome' }, params: { step: 8, wobble: 2, wave: 120, jitter: 0.5, press: 0, taper: 0, overshoot: 0 } },
      eave: { type: 'wave', params: { x0: '$w', x1: '-$w', y: '$h', bumps: '$stripes', amp: 9, n: 90 } },
      domeS: { type: 'join', in: { list: ['domeH', 'eave'] }, params: { close: 1 } },
      wall: { type: 'polygon', params: { pts: '-$w $h $w $h $w $bottom -$w $bottom' } },
      all: { type: 'merge', in: { list: ['domeS', 'wall'] } },
      paper: { type: 'fill', in: { geo: 'all' }, params: { ink: 'all', mode: 'cut' } },
      // wedges from the apex, every other one pink
      wedgesA: { type: 'copy', params: { n: '$stripes' }, template: {
        let: { x0: '-$w + @i/@n*2*$w', x1: '-$w + (@i+1)/@n*2*$w' },
        nodes: { p: { type: 'polygon', params: { pts: '0 -8 $x1 $h+30 $x0 $h+30' } }, a: { type: 'attr', in: { geo: 'p' }, attrs: { odd: '@i%2' } } }, output: 'a' } },
      wedgesP: { type: 'filter', in: { geo: 'wedgesA' }, params: { expr: '@odd' } },
      wedgesPink: { type: 'fill', in: { geo: 'wedgesP' }, params: { ink: 'pink', mode: 'solid' } },
      wedgesClip: { type: 'crop', in: { marks: ['wedgesPink'], geo: 'domeS' } },
      // wall stripes
      barsA: { type: 'copy', params: { n: '$stripes' }, template: {
        let: { x0: '-$w + @i/@n*2*$w', x1: '-$w + (@i+1)/@n*2*$w' },
        nodes: { p: { type: 'polygon', params: { pts: '$x0 $h $x1 $h $x1 $bottom $x0 $bottom' } }, a: { type: 'attr', in: { geo: 'p' }, attrs: { odd: '@i%2' } } }, output: 'a' } },
      barsP: { type: 'filter', in: { geo: 'barsA' }, params: { expr: '@odd' } },
      barsPink: { type: 'fill', in: { geo: 'barsP' }, params: { ink: 'pink', mode: 'solid' } },
      // orange eave band and the navy outline
      band: { type: 'wrangle', in: { geo: 'eave' }, params: { w: 7 } },
      bandP: { type: 'stroke', in: { geo: 'band' }, params: { ink: 'pink', mode: 'solid' } },
      bandY: { type: 'stroke', in: { geo: 'band' }, params: { ink: 'yellow', mode: 'add' } },
      edge: { type: 'stroke', in: { geo: 'domeH' }, params: { ink: 'blue', mode: 'add', w: 2.5, tone: 0.8 } },
      edgeP: { type: 'stroke', in: { geo: 'domeH' }, params: { ink: 'pink', mode: 'add', w: 2.5 } },
      // bulbs along the eave and a flag at the apex
      bulbPts: { type: 'resample', in: { geo: 'eave' }, params: { step: 24 } },
      bulbY: { type: 'dots', in: { geo: 'bulbPts' }, params: { ink: 'yellow', mode: 'solid', r: '3+1.5*rand(1)' } },
      bulbW: { type: 'dots', in: { geo: 'bulbPts' }, params: { ink: 'all', mode: 'cut', r: '1.2+0.8*rand(2)' } },
      pole: { type: 'line', params: { x0: 0, y0: 0, x1: 0, y1: -26, n: 2 } },
      poleS: { type: 'stroke', in: { geo: 'pole' }, params: { ink: 'blue', mode: 'solid', w: 2.5 }, when: '$flag' },
      flag: { type: 'polygon', params: { pts: '0 -26 22 -20 0 -12' } },
      flagP: { type: 'fill', in: { geo: 'flag' }, params: { ink: 'pink', mode: 'solid' }, when: '$flag' },
      out: { type: 'merge', in: { list: ['paper', 'wedgesClip', 'barsPink', 'bandP', 'bandY', 'edge', 'edgeP', 'bulbY', 'bulbW', 'poleS', 'flagP'] } },
    },
    output: 'out',
  },
};

export const ferrisTent = LIB.ferrisTent;
