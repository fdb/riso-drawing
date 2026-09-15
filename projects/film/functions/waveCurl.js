// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- curl: streaks inside a breaking wave. Concentric hand-drawn arcs around the tube,
// dark ink and paper-white alternately, with a few thin pink ones, all turning slowly.
// Each arc's centre slides down-left and its sweep widens, so the set spirals off-centre ----
LIB.waveCurl = {
  label: 'Wave curl streaks',
  params: {
    x: Q(800, 0, 1080, 1), y: Q(520, 0, 1080, 1), r0: Q(200, 0, 600, 1, 'inner radius'), r1: Q(420, 0, 800, 1, 'outer radius'),
    count: Q(8, 1, 30, 1), a0: Q(150, -360, 720, 1, 'start angle (deg)'), a1: Q(400, -360, 720, 1, 'end angle (deg)'),
    wDark: Q(9, 0.5, 30, 0.5, 'dark arc width'), wLight: Q(5, 0.5, 30, 0.5, 'paper arc width'), drift: Q(14, 0, 40, 0.5, 'centre shift per arc (px, down-left)'),
    sweep: Q(75, 0, 200, 1, 'extra degrees for the outer arcs'), spin: Q(0.04, 0, 0.5, 0.01, 'turn with time (rad)'), pinks: Q(3, 0, 10, 1, 'thin pink arcs'),
  },
  xf: { x: '$x', y: '$y', rot: '$spin*sin(t*0.8)' },
  graph: {
    nodes: {
      arcs: { type: 'copy', params: { n: '$count' }, template: {
        let: { r: '$r0 + ($r1-$r0)*(@i+0.5)/@n + (rand(1)-0.5)*($r1-$r0)/@n*0.6', s: '$a0 - 12*@i/@n + (rand(2)-0.5)*30', e: '$a1 + $sweep*@i/@n - rand(3)*40', c: '$drift*@i*(0.7+0.6*rand(4))' },
        nodes: { a: { type: 'ellipse', params: { x: '-$c*0.8', y: '$c', rx: '$r', ry: '$r*(0.9+0.1*rand(5))', a0: '$s', a1: '$e', n: 90 } },
          k: { type: 'attr', in: { geo: 'a' }, attrs: { dark: '@i % 2' } } }, output: 'k' } },
      arcsH: { type: 'hand', in: { geo: 'arcs' }, params: { step: 6, wobble: 3, wave: 120, jitter: 0.6, press: 0.6, taper: 0.6, overshoot: 0 } },
      arcsW: { type: 'wrangle', in: { geo: 'arcsH' }, params: { w: '@pw*(@dark ? $wDark : $wLight)/2*(0.6+0.8*sin(@v*PI))' } },
      dark: { type: 'filter', in: { geo: 'arcsW' }, params: { expr: '@dark' } },
      light: { type: 'filter', in: { geo: 'arcsW' }, params: { expr: '!@dark' } },
      darkB: { type: 'stroke', in: { geo: 'dark' }, params: { ink: 'blue', mode: 'add' } },
      darkP: { type: 'stroke', in: { geo: 'dark' }, params: { ink: 'pink', mode: 'add', tone: 0.9 } },
      darkY: { type: 'stroke', in: { geo: 'dark' }, params: { ink: 'yellow', mode: 'add', tone: 0.5 } },
      lightS: { type: 'stroke', in: { geo: 'light' }, params: { ink: 'all', mode: 'cut' } },
      pinks: { type: 'copy', params: { n: '$pinks' }, template: {
        let: { r: '$r0 + ($r1-$r0)*rand(1)', s: '$a0 + 30 + rand(2)*80', e: '$s + 60 + rand(3)*80' },
        nodes: { a: { type: 'ellipse', params: { x: 0, y: 0, rx: '$r', ry: '$r*0.95', a0: '$s', a1: '$e', n: 40 } } }, output: 'a' } },
      pinksH: { type: 'hand', in: { geo: 'pinks' }, params: { step: 6, wobble: 2, wave: 90, jitter: 0.5, press: 0.5, taper: 0.7, overshoot: 0 } },
      pinksW: { type: 'wrangle', in: { geo: 'pinksH' }, params: { w: '@pw*$wLight/3' } },
      pinksS: { type: 'stroke', in: { geo: 'pinksW' }, params: { ink: 'pink', mode: 'solid' } },
      out: { type: 'merge', in: { list: ['darkB', 'darkP', 'darkY', 'lightS', 'pinksS'] } },
    },
    output: 'out',
  },
};

export const waveCurl = LIB.waveCurl;
