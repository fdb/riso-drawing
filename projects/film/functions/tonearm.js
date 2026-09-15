// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- tonearm: a counterweight knob, a dotted pivot disc, a curved paper-white arm with a blue offset, a cartridge at the tip ----
LIB.tonearm = {
  label: 'Tonearm',
  params: {
    x: Q(915, 0, 1080, 1, 'pivot x'), y: Q(200, 0, 1080, 1, 'pivot y'), tipX: Q(750, 0, 1080, 1), tipY: Q(760, 0, 1080, 1),
    r: Q(70, 10, 200, 1, 'pivot radius'), w: Q(22, 2, 40, 0.5, 'arm width'), sway: Q(0, 0, 10, 0.1, 'tip drift (px)'),
  },
  graph: {
    let: { dx: '$tipX-$x', dy: '$tipY-$y', ddx: '($tipX-$x)*0.3', ddy: '($tipY-$y)*0.07', ux: '$ddx/sqrt($ddx*$ddx+$ddy*$ddy)', uy: '$ddy/sqrt($ddx*$ddx+$ddy*$ddy)', cx: '$tipX+$sway*sin(t*1.3)+$ux*20', cy: '$tipY+$uy*20' },
    nodes: {
      knob: { type: 'circle', params: { x: '$x+8', y: '$y-115', r: '$r*0.6', n: 48 } },
      knobH: { type: 'hand', in: { geo: 'knob' }, params: { step: 6, wobble: 1.5, wave: 60, jitter: 0.4, press: 0, taper: 0, overshoot: 0 } },
      knobB: { type: 'fill', in: { geo: 'knobH' }, params: { ink: 'blue', mode: 'add' } },
      knobP: { type: 'fill', in: { geo: 'knobH' }, params: { ink: 'pink', mode: 'add' } },
      knobY: { type: 'fill', in: { geo: 'knobH' }, params: { ink: 'yellow', mode: 'add' } },
      knobHi: { type: 'ellipse', params: { x: '$x-2', y: '$y-122', rx: '$r*0.36', ry: '$r*0.3', a0: 190, a1: 330, n: 20 } },
      knobHiS: { type: 'stroke', in: { geo: 'knobHi' }, params: { ink: 'pink', mode: 'cut', w: 4 } },
      stem: { type: 'line', params: { x0: '$x+4', y0: '$y-80', x1: '$x', y1: '$y-20', n: 4 } },
      stemS: { type: 'stroke', in: { geo: 'stem' }, params: { ink: 'blue', mode: 'add', w: 10 } },
      pivotSh: { type: 'circle', params: { x: '$x+12', y: '$y+10', r: '$r', n: 64 } },
      pivotShP: { type: 'fill', in: { geo: 'pivotSh' }, params: { ink: 'pink', mode: 'add', tone: 0.9 } },
      pivotShY: { type: 'fill', in: { geo: 'pivotSh' }, params: { ink: 'yellow', mode: 'add' } },
      pivot: { type: 'circle', params: { x: '$x', y: '$y', r: '$r', n: 64 } },
      pivotH: { type: 'hand', in: { geo: 'pivot' }, params: { step: 7, wobble: 1.5, wave: 80, jitter: 0.4, press: 0, taper: 0, overshoot: 0 } },
      pivotC: { type: 'fill', in: { geo: 'pivotH' }, params: { ink: 'all', mode: 'cut' } },
      pivotF: { type: 'field', params: { expr: '0.3 + 0.35*radial(@x,@y,$x,$y,$r*0.7) + 0.1*(noise(@x,@y,20,8)-0.5)' } },
      pivotT: { type: 'tint', in: { geo: 'pivotH', field: 'pivotF' }, params: { ink: 'blue', cell: 4.5, angle: 0.5 } },
      pivotRing: { type: 'circle', params: { x: '$x', y: '$y', r: '$r*0.55', n: 48 } },
      pivotRingS: { type: 'stroke', in: { geo: 'pivotRing' }, params: { ink: 'all', mode: 'cut', w: 5 } },
      pivotDot: { type: 'circle', params: { x: '$x', y: '$y', r: '$r*0.2', n: 24 } },
      pivotDotB: { type: 'fill', in: { geo: 'pivotDot' }, params: { ink: 'blue', mode: 'solid' } },
      // the arm: straight down from the pivot, then a sweep to the cartridge
      arm: { type: 'polygon', params: { pts: '$x $y+$r*0.6  $x-$dx*0.1 $y+$dy*0.3  $x-$dx*0.02 $y+$dy*0.55  $x+$dx*0.3 $y+$dy*0.78  $x+$dx*0.7 $y+$dy*0.93  $x+$dx+$sway*sin(t*1.3) $y+$dy', closed: 0 } },
      armH0: { type: 'hand', in: { geo: 'arm' }, params: { step: 8, wobble: 2, wave: 200, jitter: 0.4, press: 0, taper: 0, overshoot: 0 } },
      armH: { type: 'wrangle', in: { geo: 'armH0' }, params: { w: '$w*(0.92+0.16*noise(@v*800,2,120,9))' } },
      armSh: { type: 'transform', in: { geo: 'armH' }, params: { x: 10, y: 8 } },
      armShB: { type: 'stroke', in: { geo: 'armSh' }, params: { ink: 'blue', mode: 'add', w: '$w' } },
      armShP: { type: 'stroke', in: { geo: 'armSh' }, params: { ink: 'pink', mode: 'add', w: '$w*0.7', tone: 0.8 } },
      armC: { type: 'stroke', in: { geo: 'armH' }, params: { ink: 'all', mode: 'cut', w: '$w' } },
      armT: { type: 'stroke', in: { geo: 'armH' }, params: { ink: 'blue', mode: 'add', w: '$w*0.35', tone: 0.35 } },
      // cartridge: a blue block along the arm, a paper band, a pink tip at the far end
      cart: { type: 'polygon', params: { pts: '$cx-$ux*27+$uy*20 $cy-$uy*27-$ux*20 $cx+$ux*27+$uy*20 $cy+$uy*27-$ux*20 $cx+$ux*27-$uy*20 $cy+$uy*27+$ux*20 $cx-$ux*27-$uy*20 $cy-$uy*27+$ux*20' } },
      cartB: { type: 'fill', in: { geo: 'cart' }, params: { ink: 'blue', mode: 'solid' } },
      band: { type: 'polygon', params: { pts: '$cx+$ux*9+$uy*20 $cy+$uy*9-$ux*20 $cx+$ux*15+$uy*20 $cy+$uy*15-$ux*20 $cx+$ux*15-$uy*20 $cy+$uy*15+$ux*20 $cx+$ux*9-$uy*20 $cy+$uy*9+$ux*20' } },
      bandCut: { type: 'fill', in: { geo: 'band' }, params: { ink: 'all', mode: 'cut' } },
      tip: { type: 'polygon', params: { pts: '$cx+$ux*15+$uy*20 $cy+$uy*15-$ux*20 $cx+$ux*27+$uy*20 $cy+$uy*27-$ux*20 $cx+$ux*27-$uy*20 $cy+$uy*27+$ux*20 $cx+$ux*15-$uy*20 $cy+$uy*15+$ux*20' } },
      tipP: { type: 'fill', in: { geo: 'tip' }, params: { ink: 'pink', mode: 'solid' } },
      out: { type: 'merge', in: { list: ['knobB', 'knobP', 'knobY', 'knobHiS', 'stemS', 'pivotShP', 'pivotShY', 'pivotC', 'pivotT', 'pivotRingS', 'pivotDotB', 'armShB', 'armShP', 'armC', 'armT', 'cartB', 'bandCut', 'tipP'] } },
    },
    output: 'out',
  },
};

export const tonearm = LIB.tonearm;
