// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- bell: a temple bell hanging from a loop. Origin at the shoulder centre; body 700 tall. Black bronze with a warm highlight band, bands, bosses, a medallion ----
LIB.bell = {
  label: 'Temple bell',
  params: { x: Q(420, 0, 1080, 1), y: Q(250, 0, 1080, 1), scale: Q(1, 0.1, 4, 0.01), rot: Q(0, -0.5, 0.5, 0.001), light: Q(140, -300, 300, 1, 'highlight band x') },
  xf: { x: '$x', y: '$y', rot: '$rot', scale: '$scale' },
  graph: {
    nodes: {
      body: { type: 'polygon', params: { pts: '-200 0 -216 18 -222 200 -228 420 -236 560 -252 640 -290 676 -292 692 292 692 290 676 252 640 236 560 228 420 222 200 216 18 200 0 160 -14 80 -24 0 -28 -80 -24 -160 -14' } },
      bodyH: { type: 'hand', in: { geo: 'body' }, params: { step: 8, wobble: 2, wave: 200, jitter: 0.6, press: 0, taper: 0, overshoot: 0 } },
      bodyP: { type: 'fill', in: { geo: 'bodyH' }, params: { ink: 'pink', mode: 'solid' } },
      bodyY: { type: 'fill', in: { geo: 'bodyH' }, params: { ink: 'yellow', mode: 'add' } },
      shade: { type: 'field', params: { expr: 'clamp(1 - 0.9*pow(max(0, 1 - abs(@x - $light)/120), 1.4) - 0.25*pow(max(0, 1 - abs(@x - $light - 200)/120), 2) + 0.1*(noise(@x,@y,60,5)-0.5))' } },
      bodyB: { type: 'tint', in: { geo: 'bodyH', field: 'shade' }, params: { ink: 'blue', cell: 5.6, angle: 0.26 } },
      loop: { type: 'ellipse', params: { x: 0, y: -92, rx: 48, ry: 60, n: 60 } },
      loopS: { type: 'stroke', in: { geo: 'loop' }, params: { ink: 'all', mode: 'add', w: 24 } },
      link: { type: 'polygon', params: { pts: '-16 -260 16 -260 16 -140 -16 -140' } },
      linkF: { type: 'fill', in: { geo: 'link' }, params: { ink: 'all', mode: 'add' } },
      // bands: pairs of thin orange lines (blue removed) across the body
      bands: { type: 'copy', params: { n: 6 }, template: {
        let: { yy: '(@i < 2 ? 60 + @i*22 : @i < 4 ? 330 + (@i-2)*22 : 560 + (@i-4)*22)', hw: '(@i < 2 ? 214 : @i < 4 ? 226 : 236)' },
        nodes: { l: { type: 'line', params: { x0: '-$hw', y0: '$yy', x1: '$hw', y1: '$yy', n: 40 } }, w: { type: 'wrangle', in: { geo: 'l' }, params: { w: 4 } } }, output: 'w' } },
      dividers: { type: 'copy', params: { n: 4 }, template: {
        let: { xx: '(@i < 2 ? -160 + @i*100 : 60 + (@i-2)*100)' },
        nodes: { l: { type: 'line', params: { x0: '$xx', y0: 82, x1: '$xx', y1: 330, n: 20 } }, w: { type: 'wrangle', in: { geo: 'l' }, params: { w: 3.5 } } }, output: 'w' } },
      lines: { type: 'merge', in: { list: ['bands', 'dividers'] } },
      linesH: { type: 'hand', in: { geo: 'lines' }, params: { step: 6, wobble: 1, wave: 100, jitter: 0.4, press: 0.4, taper: 0.1, overshoot: 0 } },
      linesS: { type: 'stroke', in: { geo: 'linesH' }, params: { ink: 'blue', mode: 'cut' } },
      // bosses: 2 + 3 + 2 columns, 5 rows
      bossPts: { type: 'copy', params: { n: 35 }, template: {
        let: { c: 'floor(@i/5)', r: '@i - floor(@i/5)*5', xx: '($c < 2 ? -196 + $c*28 : $c < 5 ? -30 + ($c-2)*30 : 176 + ($c-5)*28)' },
        nodes: { p: { type: 'point', params: { x: '$xx + (rand(1)-0.5)*3', y: '100 + $r*50 + (rand(2)-0.5)*3' } } }, output: 'p' } },
      bossD: { type: 'dots', in: { geo: 'bossPts' }, params: { ink: 'blue', mode: 'cut', r: '11 + rand(1)' } },
      bossRim: { type: 'dots', in: { geo: 'bossPts' }, params: { ink: 'pink', mode: 'add', r: 12 } },
      bossHi: { type: 'transform', in: { geo: 'bossPts' }, params: { x: -3, y: -3 } },
      bossHiD: { type: 'dots', in: { geo: 'bossHi' }, params: { ink: 'all', mode: 'cut', r: 4 } },
      // medallion
      medal: { type: 'circle', params: { x: 60, y: 440, r: 34, n: 40 } },
      medalS: { type: 'stroke', in: { geo: 'medal' }, params: { ink: 'blue', mode: 'cut', w: 3 } },
      petals: { type: 'rays', params: { x: 60, y: 440, a0: 0, a1: 315, count: 8, r0: 6, r1: 26 } },
      petalsS: { type: 'stroke', in: { geo: 'petals' }, params: { ink: 'blue', mode: 'cut', w: 3 } },
      out: { type: 'merge', in: { list: ['linkF', 'loopS', 'bodyP', 'bodyY', 'bodyB', 'linesS', 'bossD', 'bossRim', 'bossHiD', 'medalS', 'petalsS'] } },
    },
    output: 'out',
  },
};

export const bell = LIB.bell;
