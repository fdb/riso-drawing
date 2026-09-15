// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- balloon: a hot air balloon. Gores between meridians of a sphere, squeezed into a teardrop,
// filled in up to three inks cycling around (each with an optional second ink added on top),
// blue shade on one side, a paper band with dots, a zigzag, ropes and a brown basket. Sways with t. ----
LIB.balloonsBalloon = {
  label: 'Hot air balloon',
  params: {
    x: Q(540, -200, 1300, 1), y: Q(400, -200, 1300, 1, 'centre of the crown'), r: Q(120, 10, 400, 1),
    gores: Q(8, 2, 24, 1), ncol: Q(2, 1, 3, 1, 'inks cycling'),
    inkA: { def: 'pink', kind: 'ink' }, mixA: { def: 'none', kind: 'ink', label: 'added over A (none)' },
    inkB: { def: 'pink', kind: 'ink' }, mixB: { def: 'blue', kind: 'ink', label: 'added over B (none)' },
    inkC: { def: 'yellow', kind: 'ink' }, mixC: { def: 'none', kind: 'ink', label: 'added over C (none)' },
    shade: Q(0.5, 0, 1.2, 0.01, 'blue shade on the right'), band: Q(0, 0, 1, 1, 'paper band with dots'), bandY: Q(0.15, -1, 1, 0.01),
    zig: Q(0, 0, 1, 1, 'zigzag'), zigInk: { def: 'yellow', kind: 'ink' }, zigY: Q(-0.3, -1, 1, 0.01),
    lines: Q(1, 0, 1, 1, 'gore lines'), sway: Q(4, 0, 30, 0.1), seed: Q(1, 0, 99, 1),
  },
  xf: { x: '$x + $sway*sin(t*0.6+$seed)', y: '$y + $sway*0.6*sin(t*0.9+$seed*2)', rot: '0.015*sin(t*0.5+$seed)' },
  graph: {
    nodes: {
      stripes: { type: 'copy', params: { n: '$gores' }, template: {
        let: { r0: '$r*cos(@i/@n*PI)', r1: '$r*cos((@i+1)/@n*PI)' },
        nodes: {
          a: { type: 'ellipse', params: { x: 0, y: 0, rx: '$r0', ry: '$r', a0: -90, a1: 90, n: 24 } },
          b: { type: 'ellipse', params: { x: 0, y: 0, rx: '$r1', ry: '$r', a0: -90, a1: 90, n: 24 } },
          bR: { type: 'reverse', in: { geo: 'b' } },
          g: { type: 'join', in: { list: ['a', 'bR'] }, params: { close: 1 } },
          k: { type: 'attr', in: { geo: 'g' }, attrs: { k: '@i % $ncol' } },
        }, output: 'k' } },
      tear: { type: 'wrangle', in: { geo: 'stripes' }, params: { x: '@y>0 ? @x*(1-0.62*pow(@y/$r,2.2)) : @x', y: '@y>0 ? @y*1.35 : @y' } },
      sA: { type: 'filter', in: { geo: 'tear' }, params: { expr: '@k == 0' } },
      sAF: { type: 'fill', in: { geo: 'sA' }, params: { ink: '$inkA', mode: 'solid' } },
      sAM: { type: 'fill', in: { geo: 'sA' }, params: { ink: '$mixA', mode: 'add' }, when: '$mixA != "none"' },
      sB: { type: 'filter', in: { geo: 'tear' }, params: { expr: '@k == 1' } },
      sBF: { type: 'fill', in: { geo: 'sB' }, params: { ink: '$inkB', mode: 'solid' } },
      sBM: { type: 'fill', in: { geo: 'sB' }, params: { ink: '$mixB', mode: 'add' }, when: '$mixB != "none"' },
      sC: { type: 'filter', in: { geo: 'tear' }, params: { expr: '@k == 2' } },
      sCF: { type: 'fill', in: { geo: 'sC' }, params: { ink: '$inkC', mode: 'solid' } },
      sCM: { type: 'fill', in: { geo: 'sC' }, params: { ink: '$mixC', mode: 'add' }, when: '$mixC != "none"' },
      // the whole envelope, for clipping, shade and the outline
      env: { type: 'circle', params: { x: 0, y: 0, r: '$r', n: 64 } },
      envT: { type: 'wrangle', in: { geo: 'env' }, params: { x: '@y>0 ? @x*(1-0.62*pow(@y/$r,2.2)) : @x', y: '@y>0 ? @y*1.35 : @y', w: '$r*0.02' } },
      shadeF: { type: 'field', params: { expr: 'clamp($shade*(1.3*lin(@x,@y,-$r*0.3,0,$r,0)-0.15))' } },
      shadeT: { type: 'tint', in: { geo: 'envT', field: 'shadeF' }, params: { ink: 'blue', cell: '$cellBlue', angle: '$angleBlue*PI/180' } },
      zigW: { type: 'wave', params: { x0: '-$r', x1: '$r', y: '$zigY*$r', bumps: 12, amp: '$r*0.05', n: 48, abs: 0 } },
      zigT: { type: 'wrangle', in: { geo: 'zigW' }, params: { x: '@x*(1-0.62*pow(max(0,@y)/$r,2.2))', y: '@y>0 ? @y*1.35 : @y', w: '$r*0.05' } },
      zigH: { type: 'hand', in: { geo: 'zigT' }, params: { step: 4, wobble: 1, wave: 30, jitter: 0.3, press: 0.3, taper: 0, overshoot: 0 } },
      zigS: { type: 'stroke', in: { geo: 'zigH' }, params: { ink: '$zigInk', mode: 'add' }, when: '$zig' },
      zigC: { type: 'crop', in: { marks: ['zigS'], geo: 'envT' } },
      bandR: { type: 'rect', params: { x: '-$r*1.1', y: '$bandY*$r - $r*0.1', w: '$r*2.2', h: '$r*0.2' } },
      bandC: { type: 'fill', in: { geo: 'bandR' }, params: { ink: 'all', mode: 'cut' }, when: '$band' },
      bandL: { type: 'line', params: { x0: '-$r*0.95', y0: '$bandY*$r', x1: '$r*0.95', y1: '$bandY*$r', n: 9 } },
      bandD: { type: 'dots', in: { geo: 'bandL' }, params: { ink: 'blue', mode: 'add', r: '$r*0.035*(0.8+0.4*rand(1))' }, when: '$band' },
      bandK: { type: 'crop', in: { marks: ['bandC', 'bandD'], geo: 'envT' } },
      goreS: { type: 'stroke', in: { geo: 'tear' }, params: { ink: 'blue', mode: 'add', w: '$r*0.012' }, when: '$lines' },
      envH: { type: 'hand', in: { geo: 'envT' }, params: { step: 6, wobble: 1.5, wave: 80, jitter: 0.4, press: 0.4, taper: 0, overshoot: 0 } },
      envS: { type: 'stroke', in: { geo: 'envH' }, params: { ink: 'blue', mode: 'add' } },
      // highlight strokes top left
      hi: { type: 'polygon', params: { pts: '-$r*0.55 -$r*0.55 -$r*0.42 -$r*0.2 -$r*0.42 -$r*0.62 -$r*0.3 -$r*0.3', closed: 0 } },
      hiS: { type: 'stroke', in: { geo: 'hi' }, params: { ink: 'all', mode: 'cut', w: '$r*0.02' } },
      // ropes and basket
      ropes: { type: 'polygon', params: { pts: '-$r*0.28 $r*1.3 -$r*0.13 $r*1.72 $r*0.13 $r*1.72 $r*0.28 $r*1.3', closed: 0 } },
      ropesS: { type: 'stroke', in: { geo: 'ropes' }, params: { ink: 'blue', mode: 'add', w: '$r*0.012' } },
      basket: { type: 'rect', params: { x: '-$r*0.16', y: '$r*1.7', w: '$r*0.32', h: '$r*0.2' } },
      basketB: { type: 'fill', in: { geo: 'basket' }, params: { ink: 'blue', mode: 'solid', tone: 0.7 } },
      basketP: { type: 'fill', in: { geo: 'basket' }, params: { ink: 'pink', mode: 'add', tone: 0.8 } },
      basketY: { type: 'fill', in: { geo: 'basket' }, params: { ink: 'yellow', mode: 'add' } },
      out: { type: 'merge', in: { list: ['sAF', 'sAM', 'sBF', 'sBM', 'sCF', 'sCM', 'shadeT', 'zigC', 'bandK', 'goreS', 'envS', 'hiS', 'ropesS', 'basketB', 'basketP', 'basketY'] } },
    },
    output: 'out',
  },
};

export const balloonsBalloon = LIB.balloonsBalloon;
