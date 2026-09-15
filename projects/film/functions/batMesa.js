// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- batMesa: the dark mesa of the bats world. A rounded mass with hoodoos, a lit top with dark dashes, an orange rim on its left ----
LIB.batMesa = {
  label: 'Canyon mesa',
  params: {},
  graph: {
    nodes: {
      mesaTopArc: { type: 'ellipse', params: { x: 280, y: 700, rx: 190, ry: 60, a0: 180, a1: 360, n: 40 } },
      mesaSides: { type: 'polygon', params: { pts: '485 780 478 880 440 1000 410 1100 70 1100 75 950 85 820', closed: 0 } },
      mesa: { type: 'join', in: { list: ['mesaTopArc', 'mesaSides'] }, params: { close: 1 } },
      mesaH: { type: 'hand', in: { geo: 'mesa' }, params: { step: 6, wobble: 3, wave: 40, jitter: 1, press: 0, taper: 0, overshoot: 0 } },
      mesaB: { type: 'fill', in: { geo: 'mesaAll' }, params: { ink: 'blue', mode: 'add', tone: 1 } },
      mesaP: { type: 'fill', in: { geo: 'mesaAll' }, params: { ink: 'pink', mode: 'add', tone: 1 } },
      mesaY: { type: 'fill', in: { geo: 'mesaAll' }, params: { ink: 'yellow', mode: 'add', tone: 1 } },
      hoodoos: { type: 'copy', params: { n: 5, x: '105 + @i*34 + (rand(1)-0.5)*8', y: '704 - 60*sqrt(max(0, 1 - pow((105 + @i*34 - 280)/190, 2))) - 8*rand(2)' }, template: { nodes: { r: { type: 'polygon', params: { pts: '-7 -55*(0.8+0.4*rand(3)) 7 -55*(0.8+0.4*rand(3)) 8 0 -8 0' } } }, output: 'r' } },
      hoodoosH: { type: 'hand', in: { geo: 'hoodoos' }, params: { step: 4, wobble: 1.5, wave: 30, jitter: 0.6, press: 0, taper: 0, overshoot: 0 } },
      mesaAll: { type: 'merge', in: { list: ['mesaH', 'hoodoosH'] } },
      mesaTop: { type: 'polygon', params: { pts: '120 690 200 655 280 642 360 655 440 690 445 728 300 732 120 726' } },
      mesaPts: { type: 'scatter', in: { geo: 'mesaTop' }, params: { count: 45 } },
      mesaTex: { type: 'copy', in: { points: 'mesaPts' }, params: { orient: 0 }, template: { nodes: { l: { type: 'line', params: { x0: '-6-14*rand(1)', y0: '-3', x1: '6+14*rand(1)', y1: '3*(rand(2)-0.5)', n: 2 } } }, output: 'l' } },
      mesaLit: { type: 'fill', in: { geo: 'mesaTop' }, params: { ink: 'blue', mode: 'cut' } },
      fLit: { type: 'field', params: { expr: 'clamp(0.8 + 0.3*(noise(@x,@y,40,31)-0.5))' } },
      mesaLitP: { type: 'tint', in: { geo: 'mesaTop', field: 'fLit' }, params: { ink: 'pink', cell: 7, angle: 0.79 } },
      mesaTexS: { type: 'stroke', in: { geo: 'mesaTex' }, params: { ink: 'blue', mode: 'add', w: 3.5 } },
      mesaTexP: { type: 'stroke', in: { geo: 'mesaTex' }, params: { ink: 'pink', mode: 'add', w: 3.5 } },
      mesaEdge: { type: 'polygon', params: { pts: '70 1100 75 950 85 820 90 700 110 665', closed: 0 } },
      mesaEdgeH: { type: 'hand', in: { geo: 'mesaEdge' }, params: { step: 6, wobble: 3, wave: 40, jitter: 1, press: 0.4, taper: 0.3, overshoot: 0 } },
      mesaRimP: { type: 'stroke', in: { geo: 'mesaEdgeH' }, params: { ink: 'pink', mode: 'solid', w: 3 } },
      mesaRimY: { type: 'stroke', in: { geo: 'mesaEdgeH' }, params: { ink: 'yellow', mode: 'add', w: 3 } },
      out: { type: 'merge', in: { list: ['mesaB', 'mesaP', 'mesaY', 'mesaLit', 'mesaLitP', 'mesaTexS', 'mesaTexP', 'mesaRimP', 'mesaRimY'] } },
    },
    output: 'out',
  },
};

export const batMesa = LIB.batMesa;
