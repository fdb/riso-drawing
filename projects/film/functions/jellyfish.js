// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- jellyfish: local coordinates centred on the bell, placed by xf ----
LIB.jellyfish = {
  label: 'Jellyfish',
  params: {
    x: Q(540, 0, 1080, 1), y: Q(400, 0, 1080, 1), r: Q(120, 20, 300, 1, 'bell radius'), rot: Q(0, -0.6, 0.6, 0.01, 'tilt'),
    tentacles: Q(14, 2, 40, 1), length: Q(2.8, 0.5, 5, 0.05, 'tentacle length (× r)'), thick: Q(0.6, 0, 1, 0.01, 'share of thick ribbons'),
    curl: Q(1, 0, 3, 0.01, 'whip curl'), glow: Q(1, 0, 1.5, 0.01, 'sun glow'), sway: Q(1, 0, 3, 0.01), swaySpeed: Q(1, 0, 4, 0.01),
    pulse: Q(0.03, 0, 0.15, 0.005, 'bell pulse'), bob: Q(6, 0, 30, 0.5, 'bob (px)'),
  },
  xf: { x: '$x', y: '$y + $bob*sin(t*1.1+$ph0)', rot: '$rot + 0.01*sin(t*0.7+$ph0)' },
  graph: {
    let: { ph0: 'rand(0)*TAU', ry: '$r*0.78*(1+$pulse*sin(t*3+$ph0))', cellIn: '$cellPink*($r/120)', gx: '$r*0.06', gy: '-$ry*0.1',
      gpulse: '1+0.08*sin(t*2.5+$ph0)', baseY: '$r*0.14' },
    nodes: {
      // tentacles: one line per copy, attributes decide thickness, a wrangle adds the travelling wave
      tent: { type: 'copy', params: { n: '$tentacles' }, template: {
        let: { x0: '@u*2*$r*0.84 + (rand(1)-0.5)*$r*0.08', len: '$r*$length*(0.7+0.5*rand(2))' },
        nodes: {
          ln: { type: 'line', params: { x0: '$x0', y0: '$baseY', x1: '$x0', y1: '$baseY+$len', n: 48 } },
          at: { type: 'attr', in: { geo: 'ln' }, attrs: { thick: 'abs(@u)<0.36 && rand(3)<$thick ? 1 : 0', w: '@thick ? $r*(0.08+0.06*rand(4)) : $r*(0.03+0.02*rand(5))',
            f: '0.8+1.2*rand(6)', ph: 'rand(7)*TAU', amp: '$r*(0.1+0.2*rand(8))*$sway', drift: '@u*$r*(0.1+0.8*rand(9))' } },
          wv: { type: 'wrangle', in: { geo: 'at' }, params: { x: '@x + sin(@v*@f*TAU+@ph - t*$swaySpeed*1.5)*@amp*pow(@v,0.8) + @drift*@v*@v', w: '@w*(1-(@thick?0.55:0.4)*@v)' } },
        }, output: 'wv' } },
      thin: { type: 'filter', in: { geo: 'tent' }, params: { expr: '!@thick' } },
      thinS: { type: 'stroke', in: { geo: 'thin' }, params: { ink: 'pink', mode: 'solid' } },
      thickG: { type: 'filter', in: { geo: 'tent' }, params: { expr: '@thick' } },
      thickS: { type: 'stroke', in: { geo: 'thickG' }, params: { ink: 'pink', mode: 'solid' } },
      // paper highlight line along each ribbon
      hl: { type: 'wrangle', in: { geo: 'thickG' }, params: { x: '@x - @w*0.3*(1-0.5*@v)', w: '1.7' } },
      hlS: { type: 'slice', in: { geo: 'hl' }, params: { start: 2 } },
      hlStroke: { type: 'stroke', in: { geo: 'hlS' }, params: { ink: 'pink', mode: 'cut' } },
      // dark lens holes: points along each ribbon, a lens copied to each
      holePts: { type: 'pointsAlong', in: { geo: 'thickG' }, params: { start: '5+floor(4*rand(1))', step: '4+floor(4*rand(10+@k))', margin: 6 } },
      holes: { type: 'copy', in: { points: 'holePts' }, params: { orient: 1, dx: '@w*0.22' }, template: {
        nodes: { l: { type: 'lens', params: { len: '$r*(0.09+0.07*rand(1))', wid: '@w*(1-0.5*@v)*(0.3+0.12*rand(2))' } } }, output: 'l' } },
      holesCut: { type: 'fill', in: { geo: 'holes' }, params: { ink: 'pink', mode: 'cut' } },
      // curling whip arms
      whip: { type: 'copy', params: { n: 6 }, template: {
        let: { side: '@i%2 ? 1 : -1', f: '1+1.2*rand(2)', ph: 'rand(3)*TAU' },
        nodes: {
          w: { type: 'walk', params: { x: '$side*$r*(0.3+0.55*rand(1))', y: '$baseY', heading: 'PI/2+$side*(-0.4+0.5*rand(4))', step: '$r*0.05',
            n: 'round($length*(0.7+0.4*rand(5))/0.05)', turn: '$side*$curl*(0.02+0.045*sin(@v*$f*TAU+$ph - t*$swaySpeed))*(0.3+@v)' } },
          tw: { type: 'wrangle', in: { geo: 'w' }, params: { w: '$r*(0.028+0.012*rand(6))*(1-0.3*@v)' } },
        }, output: 'tw' } },
      whipS: { type: 'stroke', in: { geo: 'whip' }, params: { ink: 'pink', mode: 'solid' } },
      // skirt: a dotted band with a scalloped solid edge
      skTop: { type: 'line', params: { x0: '-$r*0.9', y0: '$r*0.02', x1: '$r*0.9', y1: '$r*0.02' } },
      skWave: { type: 'wave', params: { x0: '$r*0.9', x1: '-$r*0.9', y: '$r*0.215', bumps: 6, amp: '$r*0.05', n: 60 } },
      skirt: { type: 'join', in: { list: ['skTop', 'skWave'] }, params: { close: 1 } },
      skCutB: { type: 'fill', in: { geo: 'skirt' }, params: { ink: 'blue', mode: 'cut' } },
      skCutY: { type: 'fill', in: { geo: 'skirt' }, params: { ink: 'yellow', mode: 'cut' } },
      skF: { type: 'field', params: { expr: '0.5' } },
      skT: { type: 'tint', in: { geo: 'skirt', field: 'skF' }, params: { ink: 'pink', cell: '$cellIn*0.8', angle: 0.3 } },
      skWave2: { type: 'transform', in: { geo: 'skWave' }, params: { y: '$r*0.035' } },
      skWave2r: { type: 'reverse', in: { geo: 'skWave2' } },
      skBand: { type: 'join', in: { list: ['skWave', 'skWave2r'] }, params: { close: 1 } },
      skBandS: { type: 'fill', in: { geo: 'skBand' }, params: { ink: 'pink', mode: 'solid' } },
      // bell: dome + scalloped bottom, blue shading on the right
      dome: { type: 'ellipse', params: { rx: '$r', ry: '$ry', a0: 180, a1: 360, n: 64 } },
      bwave: { type: 'wave', params: { x0: '$r', x1: '-$r', y: 0, bumps: 7, amp: '$r*0.07', n: 70 } },
      bell: { type: 'join', in: { list: ['dome', 'bwave'] }, params: { close: 1 } },
      bellS: { type: 'fill', in: { geo: 'bell' }, params: { ink: 'pink', mode: 'solid' } },
      bShadeF: { type: 'field', params: { expr: '0.38*clamp((@x/$r-0.15)/0.85)*clamp(1-(-@y/$ry-0.4)/0.6)' } },
      bShade: { type: 'tint', in: { geo: 'bell', field: 'bShadeF' }, params: { ink: 'blue', cell: '$cellIn*0.95', angle: '$angleBlue*PI/180' } },
      // inner glow: pink dots fading from the sun, yellow sun, rays
      inner: { type: 'ellipse', params: { y: '-$ry*0.15', rx: '$r*0.8', ry: '$ry*0.58' } },
      innerCut: { type: 'fill', in: { geo: 'inner' }, params: { ink: 'pink', mode: 'cut' } },
      pinkF: { type: 'field', params: { expr: 'clamp(0.3 + 0.9*dist(@x,@y,$gx,$gy)/($r*0.8))' } },
      pinkT: { type: 'tint', in: { geo: 'inner', field: 'pinkF' }, params: { ink: 'pink', cell: '$cellIn', angle: 0.6 } },
      yelF: { type: 'field', params: { expr: 'clamp($glow*(1.2 - dist(@x,@y,$gx,$gy)/($r*0.72*$gpulse)))' } },
      yelT: { type: 'tint', in: { geo: 'inner', field: 'yelF' }, params: { ink: 'yellow', cell: '$cellIn', angle: 0.1 } },
      raysG: { type: 'rays', params: { x: '$gx', y: '$gy', a0: -162, a1: -18, count: 7, r0: '$r*0.08', r1: '$r*0.9' } },
      raysS: { type: 'stroke', in: { geo: 'raysG' }, params: { ink: 'pink', mode: 'solid', w: '$r*0.036' } },
      raysHlG: { type: 'transform', in: { geo: 'raysG' }, params: { x: '$r*0.018', y: '$r*0.012' } },
      raysHl: { type: 'stroke', in: { geo: 'raysHlG' }, params: { ink: 'all', mode: 'cut', w: '$r*0.01' } },
      raysClip: { type: 'crop', in: { marks: ['raysS', 'raysHl'], geo: 'inner' } },
      innerClip: { type: 'crop', in: { marks: ['innerCut', 'pinkT', 'yelT', 'raysClip'], geo: 'bell' } },
      // paper highlight crescent and the pale scalloped line under the rim
      cres: { type: 'ellipse', params: { rx: '$r*0.86', ry: '$ry*0.86', a0: '180*1.13', a1: '180*1.42', n: 24 } },
      cresW: { type: 'wrangle', in: { geo: 'cres' }, params: { x: '@x*(1-0.075*sin(PI*@v))', y: '@y*(1-0.075*sin(PI*@v))', w: '$r*0.13*sin(PI*@v)' } },
      cresS: { type: 'stroke', in: { geo: 'cresW' }, params: { ink: 'all', mode: 'cut' } },
      rim: { type: 'wave', params: { x0: '$r*0.92', x1: '-$r*0.92', y: '$r*0.1', bumps: 7, amp: '$r*0.045', n: 70 } },
      rimS: { type: 'stroke', in: { geo: 'rim' }, params: { ink: 'all', mode: 'cut', w: '$r*0.014' } },
      out: { type: 'merge', in: { list: ['whipS', 'thinS', 'thickS', 'hlStroke', 'holesCut', 'skCutB', 'skCutY', 'skT', 'skBandS', 'bellS', 'bShade', 'innerClip', 'cresS', 'rimS'] } },
    },
    output: 'out',
  },
};

export const jellyfish = LIB.jellyfish;
