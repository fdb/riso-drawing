// world.js — the film's worlds, as functions made of blocks. Pure data: a parameter schema, an
// optional transform, and a graph of core nodes.

const LIB = {};
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });

// ---- water: three background tints on the shared dot grid ----
LIB.water = {
  label: 'Water',
  params: { cx: Q(660, 0, 1080, 1), cy: Q(535, 0, 1080, 1), r: Q(318, 10, 600, 1), blue: Q(0.9, 0, 1.3, 0.01, 'blue density'),
    pink: Q(0.5, 0, 1.3, 0.01, 'pink haze'), yellow: Q(0.72, 0, 1.3, 0.01, 'yellow light (top left)'), mottle: Q(0.25, 0, 0.6, 0.01, 'tone mottle') },
  graph: {
    nodes: {
      disc: { type: 'circle', params: { x: '$cx', y: '$cy', r: '$r' } },
      fb: { type: 'field', params: { expr: 'clamp($blue + 0.3*radial(@x,@y,$cx+60,$cy+80,$r*1.2) - 0.4*radial(@x,@y,$cx-230,$cy-150,$r*0.85) - 0.18*radial(@x,@y,$cx+250,$cy-230,$r*0.5) - 0.12*radial(@x,@y,$cx-150,$cy+250,$r*0.5) + $mottle*(noise(@x,@y,70,1)-0.5))' } },
      tb: { type: 'tint', in: { geo: 'disc', field: 'fb' }, params: { ink: 'blue', cell: '$cellBlue', angle: '$angleBlue*PI/180' } },
      fy: { type: 'field', params: { expr: 'clamp(0.04 + $yellow*radial(@x,@y,$cx-260,$cy-140,$r) + 0.5*radial(@x,@y,$cx+260,$cy-250,$r*0.55) + 0.4*radial(@x,@y,$cx-150,$cy+290,$r*0.5) + 0.3*radial(@x,@y,$cx+280,$cy+160,$r*0.4) + $mottle*1.2*(noise(@x,@y,60,2)-0.5))' } },
      ty: { type: 'tint', in: { geo: 'disc', field: 'fy' }, params: { ink: 'yellow', cell: '$cellYellow*1.3', angle: '$angleBlue*PI/180' } },
      fp: { type: 'field', params: { expr: 'clamp($pink + 0.55*radial(@x,@y,$cx+170,$cy-150,$r*0.9) + 0.3*radial(@x,@y,$cx-40,$cy+230,$r*0.7) + 0.35*radial(@x,@y,$cx+20,$cy-120,$r*0.5) - 0.4*radial(@x,@y,$cx-240,$cy-140,$r*0.7) + $mottle*1.2*(noise(@x+150,@y+350,50,1)-0.5))' } },
      tp: { type: 'tint', in: { geo: 'disc', field: 'fp' }, params: { ink: 'pink', cell: '$cellBlue', angle: '$angleBlue*PI/180' } },
      out: { type: 'merge', in: { list: ['tb', 'ty', 'tp'] } },
    },
    output: 'out',
  },
};

// ---- stars: paper knockouts, yellow specks, a few glowing ones ----
LIB.stars = {
  label: 'Stars',
  params: { cx: Q(660, 0, 1080, 1), cy: Q(535, 0, 1080, 1), r: Q(318, 10, 600, 1), count: Q(260, 0, 600, 1), size: Q(1, 0.3, 3, 0.05),
    glow: Q(10, 0, 30, 1, 'glowing stars'), twinkle: Q(0.3, 0, 1, 0.01) },
  graph: {
    nodes: {
      pts: { type: 'scatter', params: { x: '$cx', y: '$cy', r: '$r-14', count: '$count' } },
      cut: { type: 'dots', in: { geo: 'pts' }, params: { ink: 'all', mode: 'cut', r: '(rand(1)<0.1 ? 2.6+1.2*rand(2) : 1.1+1.2*rand(2))*$size*(1-$twinkle*0.5+$twinkle*0.5*sin(t*4+@i*1.7))' } },
      ypts: { type: 'scatter', params: { x: '$cx', y: '$cy', r: '$r-14', count: 40 } },
      ydots: { type: 'dots', in: { geo: 'ypts' }, params: { ink: 'yellow', mode: 'add', r: '(1.5+1.5*rand(1))*$size' } },
      gpts: { type: 'scatter', params: { x: '$cx', y: '$cy', r: '$r-30', count: '$glow' } },
      gGlow: { type: 'glow', in: { geo: 'gpts' }, params: { ink: 'yellow', tone: 0.8, r: '(8+6*rand(1))*(1-$twinkle*0.4+$twinkle*0.4*sin(t*3+@i*2.3))' } },
      gCut1: { type: 'dots', in: { geo: 'gpts' }, params: { ink: 'blue', mode: 'cut', r: '3+2*rand(2)' } },
      gCut2: { type: 'dots', in: { geo: 'gpts' }, params: { ink: 'all', mode: 'cut', r: '1.8+0.8*rand(3)' } },
      out: { type: 'merge', in: { list: ['cut', 'ydots', 'gGlow', 'gCut1', 'gCut2'] } },
    },
    output: 'out',
  },
};

// ---- bubble: a paper ring with a highlight ----
LIB.bubble = {
  label: 'Bubble',
  params: { x: Q(540, 0, 1080, 1), y: Q(542, 0, 1080, 1), r: Q(21, 5, 60, 0.5), ring: Q(3, 1, 8, 0.25, 'ring width') },
  graph: {
    nodes: {
      c: { type: 'circle', params: { x: '$x', y: '$y', r: '$r' } },
      fb: { type: 'fill', in: { geo: 'c' }, params: { ink: 'blue' } },
      fp: { type: 'fill', in: { geo: 'c' }, params: { ink: 'pink', tone: 0.7 } },
      rc: { type: 'circle', params: { x: '$x', y: '$y', r: '$r - $ring/2' } },
      ring: { type: 'stroke', in: { geo: 'rc' }, params: { ink: 'all', mode: 'cut', w: '$ring' } },
      hi: { type: 'ellipse', params: { x: '$x-$r*0.45', y: '$y-$r*0.45', rx: '$r*0.28', ry: '$r*0.16', rot: -0.7 } },
      hiS: { type: 'fill', in: { geo: 'hi' }, params: { ink: 'all', mode: 'cut' } },
      out: { type: 'merge', in: { list: ['fb', 'fp', 'ring', 'hiS'] } },
    },
    output: 'out',
  },
};

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

// ---- sky: three ink gradients over a rectangle (top → bottom), with mottle ----
LIB.sky = {
  label: 'Sky gradient',
  params: {
    x: Q(0, 0, 1080, 1), y: Q(0, 0, 1080, 1), w: Q(1080, 0, 1080, 1), h: Q(1080, 0, 1080, 1),
    blueTop: Q(0.9, 0, 1.3), blueBottom: Q(0.9, 0, 1.3), pinkTop: Q(0.5, 0, 1.3), pinkBottom: Q(0.5, 0, 1.3),
    yellowTop: Q(0, 0, 1.3), yellowBottom: Q(0, 0, 1.3), mottle: Q(0.2, 0, 0.6), cell: Q(5.6, 2, 16, 0.1), angle: Q(15, 0, 90, 1), seed: Q(1, 0, 99, 1),
  },
  graph: {
    let: { g: 'lin(@x,@y,0,$y,0,$y+$h)' },
    nodes: {
      box: { type: 'rect', params: { x: '$x', y: '$y', w: '$w', h: '$h' } },
      fb: { type: 'field', params: { expr: 'clamp($blueTop + ($blueBottom-$blueTop)*lin(@x,@y,0,$y,0,$y+$h) + $mottle*(noise(@x,@y,90,$seed)-0.5))' } },
      tb: { type: 'tint', in: { geo: 'box', field: 'fb' }, params: { ink: 'blue', cell: '$cell', angle: '$angle*PI/180' } },
      fp: { type: 'field', params: { expr: 'clamp($pinkTop + ($pinkBottom-$pinkTop)*lin(@x,@y,0,$y,0,$y+$h) + $mottle*(noise(@x+300,@y+100,70,$seed+1)-0.5))' } },
      tp: { type: 'tint', in: { geo: 'box', field: 'fp' }, params: { ink: 'pink', cell: '$cell', angle: '$angle*PI/180' } },
      fy: { type: 'field', params: { expr: 'clamp($yellowTop + ($yellowBottom-$yellowTop)*lin(@x,@y,0,$y,0,$y+$h) + $mottle*(noise(@x+700,@y+500,80,$seed+2)-0.5))' } },
      ty: { type: 'tint', in: { geo: 'box', field: 'fy' }, params: { ink: 'yellow', cell: '$cell*1.2', angle: '$angle*PI/180' } },
      out: { type: 'merge', in: { list: ['tb', 'ty', 'tp'] } },
    },
    output: 'out',
  },
};

// ---- burst: a firework. Rays with knobbed tips, a shorter inner crown, flecks, a hanging trail ----
LIB.burst = {
  label: 'Firework burst',
  params: {
    x: Q(300, 0, 1080, 1), y: Q(300, 0, 1080, 1), r: Q(130, 10, 400, 1), ink: { def: 'yellow', kind: 'ink' }, mode: { def: 'solid', kind: 'mode' },
    rays: Q(70, 6, 200, 1), crown: Q(1, 0, 1, 0.01, 'inner crown density'), knob: Q(1, 0, 3, 0.05, 'tip size'), trail: Q(1, 0, 4, 0.05, 'trail length (× r)'),
    grow: Q(1, 0, 1, 0.01, 'growth 0..1'), bend: Q(1, 0, 3, 0.05, 'hand-drawn bend'), droop: Q(1, 0, 3, 0.05, 'rays sag at the tips'),
    tone: Q(1, 0, 1, 0.01, 'ink tone (below 1 the rays print as dots)'),
  },
  xf: { x: '$x', y: '$y' },
  graph: {
    let: { R: '$r*(0.6+0.4*$grow)' },
    nodes: {
      // each ray is its own curve: a random sideways bend, a sag towards the tip, thicker outward
      rays: { type: 'copy', params: { n: '$rays' }, template: {
        let: { a: '@i/@n*TAU + (rand(1)-0.5)*0.06', len: '$R*(0.7+0.3*rand(2))', bv: '$R*$bend*(rand(3)-0.5)*0.12', sag: '$droop*$R*0.06*(0.5+rand(4))' },
        nodes: {
          ln: { type: 'line', params: { x0: 'cos($a)*$R*0.16', y0: 'sin($a)*$R*0.16', x1: 'cos($a)*$len', y1: 'sin($a)*$len', n: 12 } },
          w: { type: 'wrangle', in: { geo: 'ln' }, params: { x: '@x + cos($a+PI/2)*sin(@v*PI)*$bv', y: '@y + sin($a+PI/2)*sin(@v*PI)*$bv + $sag*@v*@v', w: '$R*0.017*(0.6+0.6*@v)' } },
        }, output: 'w' } },
      raysH: { type: 'hand', in: { geo: 'rays' }, params: { step: 5, wobble: '$R*0.012', wave: 60, jitter: 0.5, press: 0.3, taper: 0.15, overshoot: 0 } },
      raysS: { type: 'stroke', in: { geo: 'raysH' }, params: { ink: '$ink', mode: '$mode', tone: '$tone' } },
      tips: { type: 'slice', in: { geo: 'rays' }, params: { start: 11 } },
      tipsD: { type: 'dots', in: { geo: 'tips' }, params: { ink: '$ink', mode: '$mode', tone: '$tone', r: '$R*0.022*$knob*(0.6+0.8*rand(1))' } },
      crown: { type: 'copy', params: { n: 'round($rays*0.9*$crown)' }, template: {
        let: { a: '@i/@n*TAU + rand(1)*0.1', len: '$R*(0.3+0.25*rand(2))' },
        nodes: { ln: { type: 'line', params: { x0: 'cos($a)*$R*0.17', y0: 'sin($a)*$R*0.17', x1: 'cos($a)*$len', y1: 'sin($a)*$len', n: 2 } },
          w: { type: 'wrangle', in: { geo: 'ln' }, params: { w: '$R*0.014' } } }, output: 'w' } },
      crownH: { type: 'hand', in: { geo: 'crown' }, params: { step: 4, wobble: '$R*0.01', wave: 40, jitter: 0.5, press: 0.3, taper: 0.1, overshoot: 0 } },
      crownS: { type: 'stroke', in: { geo: 'crownH' }, params: { ink: '$ink', mode: '$mode', tone: '$tone' } },
      fleckPts: { type: 'scatter', params: { x: 0, y: 0, r: '$R*0.95', count: 'round($rays*1.0)' } },
      corePts: { type: 'scatter', params: { x: 0, y: 0, r: '$R*0.2', count: 'round($rays*0.5)' } },
      core: { type: 'dots', in: { geo: 'corePts' }, params: { ink: 'all', mode: 'cut', r: '$R*0.01*(0.4+rand(1))' } },
      flecks: { type: 'dots', in: { geo: 'fleckPts' }, params: { ink: '$ink', mode: '$mode', tone: '$tone', r: '$R*0.012*(0.4+rand(1))' } },
      sparklePts: { type: 'scatter', params: { x: 0, y: 0, r: '$R*0.85', count: 'round($rays*0.9)' } },
      sparkles: { type: 'dots', in: { geo: 'sparklePts' }, params: { ink: 'all', mode: 'cut', r: '$R*0.008*(0.5+rand(1))' } },
      trailG: { type: 'line', params: { x0: 0, y0: '$R*0.15', x1: 0, y1: '$R*0.15 + $r*$trail', n: 30 } },
      trailW: { type: 'wrangle', in: { geo: 'trailG' }, params: { x: '@x + sin(@v*4)*$r*0.05*@v', w: '2.2' } },
      trailH: { type: 'hand', in: { geo: 'trailW' }, params: { step: 6, wobble: 3, wave: 90, jitter: 0.4, press: 0.4, taper: 0.2, overshoot: 0 } },
      trailS: { type: 'stroke', in: { geo: 'trailH' }, params: { ink: '$ink', mode: '$mode' } },
      trailEnd: { type: 'slice', in: { geo: 'trailW' }, params: { start: 29 } },
      trailDot: { type: 'dots', in: { geo: 'trailEnd' }, params: { ink: 'all', mode: 'cut', r: 4 } },
      out: { type: 'merge', in: { list: ['trailS', 'trailDot', 'crownS', 'raysS', 'tipsD', 'flecks', 'core', 'sparkles'] } },
    },
    output: 'out',
  },
};

// ---- ridge: a mountain layer. A noise-displaced line closed down to a base, filled with halftone or solid ink ----
LIB.ridge = {
  label: 'Mountain ridge',
  params: {
    x0: Q(-20, -200, 1080, 1), x1: Q(1100, 0, 1300, 1), y: Q(500, 0, 1080, 1, 'ridge base'), bottom: Q(1080, 0, 1200, 1),
    amp: Q(120, 0, 500, 1, 'peak height'), scale: Q(220, 20, 800, 1, 'peak width'), seed: Q(1, 0, 99, 1), sharp: Q(1, 0, 1, 0.01, 'sharp peaks'),
    blue: Q(0.5, 0, 1.3), pink: Q(0.5, 0, 1.3), fade: Q(0, 0, 1, 0.01, 'lighter towards the top'), cell: Q(5.6, 2, 16, 0.1),
  },
  graph: {
    nodes: {
      base: { type: 'line', params: { x0: '$x0', y0: '$y', x1: '$x1', y1: '$y', n: 120 } },
      ridge: { type: 'wrangle', in: { geo: 'base' }, params: { y: '@y - $amp*(1 - $sharp*abs(2*noise(@x,0,$scale,$seed)-1) - (1-$sharp)*(1-noise(@x,0,$scale,$seed)))*(0.7+0.3*noise(@x,100,$scale*3,$seed+7))' } },
      foot: { type: 'polygon', params: { pts: '$x1 $bottom $x0 $bottom', closed: 0 } },
      shape: { type: 'join', in: { list: ['ridge', 'foot'] }, params: { close: 1 } },
      fb: { type: 'field', params: { expr: 'clamp($blue*(1 - $fade*(1-lin(@x,@y,0,$y-$amp,0,$bottom))))' } },
      tb: { type: 'tint', in: { geo: 'shape', field: 'fb' }, params: { ink: 'blue', cell: '$cell', angle: 0.26 } },
      fp: { type: 'field', params: { expr: 'clamp($pink*(1 - $fade*(1-lin(@x,@y,0,$y-$amp,0,$bottom))))' } },
      tp: { type: 'tint', in: { geo: 'shape', field: 'fp' }, params: { ink: 'pink', cell: '$cell', angle: 0.26 } },
      cutY: { type: 'fill', in: { geo: 'shape' }, params: { ink: 'yellow', mode: 'cut' } },
      out: { type: 'merge', in: { list: ['cutY', 'tb', 'tp'] } },
    },
    output: 'out',
  },
};
LIB.ridge.graph.nodes.foot.params.pts = '$x1 $bottom $x0 $bottom';

// ---- treeline: firs copied along a line, as solid dark ink or as a paper cut (fog) ----
LIB.treeline = {
  label: 'Treeline',
  params: {
    x0: Q(-20, -200, 1080, 1), x1: Q(1100, 0, 1300, 1), y: Q(700, 0, 1080, 1, 'ground'), bottom: Q(1080, 0, 1200, 1),
    count: Q(40, 1, 300, 1), height: Q(90, 10, 400, 1), vary: Q(0.5, 0, 1, 0.01), seed: Q(1, 0, 99, 1),
    mode: { def: 'add', kind: 'mode', label: 'add (dark) | cut (fog)' },
  },
  graph: {
    nodes: {
      trees: { type: 'copy', params: { n: '$count', x: '$x0 + (@i+0.5)/@n*($x1-$x0) + (rand(1)-0.5)*($x1-$x0)/@n', y: '$y + rand(3)*$height*0.15', scale: '$height/120*(1-$vary+$vary*rand(2))' }, template: {
        nodes: { fir: { type: 'polygon', params: { pts: '0 -120 -13 -80 -6 -80 -19 -42 -9 -42 -25 0 25 0 9 -42 19 -42 6 -80 13 -80' } } }, output: 'fir' } },
      ground: { type: 'polygon', params: { pts: '$x0 $y $x1 $y $x1 $bottom $x0 $bottom' } },
      all: { type: 'merge', in: { list: ['trees', 'ground'] } },
      fb: { type: 'fill', in: { geo: 'all' }, params: { ink: 'blue', mode: '$mode' } },
      fp: { type: 'fill', in: { geo: 'all' }, params: { ink: 'pink', mode: '$mode' } },
      fy: { type: 'fill', in: { geo: 'all' }, params: { ink: 'yellow', mode: 'cut' } },
      out: { type: 'merge', in: { list: ['fy', 'fb', 'fp'] } },
    },
    output: 'out',
  },
};
LIB.treeline.graph.nodes.ground.params.pts = '$x0 $y $x1 $y $x1 $bottom $x0 $bottom';

// ---- flake: a snowflake. One arm with branches, copied around; optional blue halo under paper-white lines ----
LIB.flake = {
  label: 'Snowflake',
  params: {
    x: Q(540, 0, 1080, 1), y: Q(540, 0, 1080, 1), r: Q(200, 10, 600, 1), rot: Q(0, -3.2, 3.2, 0.01), arms: Q(6, 3, 12, 1),
    branches: Q(3, 0, 6, 1), spread: Q(0.95, 0.3, 1.5, 0.01, 'branch angle (rad)'), width: Q(1, 0.2, 4, 0.05),
    ink: { def: 'all', kind: 'ink' }, mode: { def: 'cut', kind: 'mode' }, tone: Q(1, 0, 1, 0.01), halo: Q(1, 0, 1, 1, 'blue halo'),
    core: Q(1, 0, 1, 1, 'yellow hex core'),
  },
  xf: { x: '$x', y: '$y', rot: '$rot' },
  graph: {
    nodes: {
      arm: { type: 'copy', params: { n: '$arms', rot: '@i/@n*TAU' }, template: {
        nodes: {
          main: { type: 'line', params: { x0: '$r*0.12', y0: 0, x1: '$r', y1: 0, n: 24 } },
          mainW: { type: 'wrangle', in: { geo: 'main' }, params: { w: '$r*0.03*$width*(1-0.5*@v)' } },
          bpts: { type: 'pointsAlong', in: { geo: 'main' }, params: { start: '6', step: 'round(17/$branches)', margin: 2 } },
          br: { type: 'copy', in: { points: 'bpts' }, params: { orient: 0 }, template: {
            nodes: {
              up: { type: 'line', params: { x0: 0, y0: 0, x1: 'cos(-$spread)*$r*(0.32-0.2*@v)', y1: 'sin(-$spread)*$r*(0.32-0.2*@v)', n: 8 } },
              dn: { type: 'line', params: { x0: 0, y0: 0, x1: 'cos($spread)*$r*(0.32-0.2*@v)', y1: 'sin($spread)*$r*(0.32-0.2*@v)', n: 8 } },
              both: { type: 'merge', in: { list: ['up', 'dn'] } },
              bw: { type: 'wrangle', in: { geo: 'both' }, params: { w: '$r*0.02*$width*(1-0.6*@v)' } },
              twigs: { type: 'pointsAlong', in: { geo: 'both' }, params: { start: 3, step: 2, margin: 1 } },
              twig: { type: 'copy', in: { points: 'twigs' }, params: { orient: 1 }, template: { nodes: {
                a: { type: 'line', params: { x0: 0, y0: 0, x1: 'cos(-1.0)*$r*0.06', y1: 'sin(-1.0)*$r*0.06', n: 2 } },
                b: { type: 'line', params: { x0: 0, y0: 0, x1: 'cos(1.0)*$r*0.06', y1: 'sin(1.0)*$r*0.06', n: 2 } },
                ab: { type: 'merge', in: { list: ['a', 'b'] } },
                abw: { type: 'wrangle', in: { geo: 'ab' }, params: { w: '$r*0.012*$width' } } }, output: 'abw' } },
              all: { type: 'merge', in: { list: ['bw', 'twig'] } },
            }, output: 'all' } },
          armAll: { type: 'merge', in: { list: ['mainW', 'br'] } },
        }, output: 'armAll' } },
      haloS: { type: 'stroke', in: { geo: 'arm' }, params: { ink: 'blue', mode: 'add', w: 1 }, when: '$halo' },
      haloW: { type: 'wrangle', in: { geo: 'arm' }, params: { w: '@pw + $r*0.014' } },
      haloS2: { type: 'stroke', in: { geo: 'haloW' }, params: { ink: 'blue', mode: 'add' }, when: '$halo' },
      armS: { type: 'stroke', in: { geo: 'arm' }, params: { ink: '$ink', mode: '$mode', tone: '$tone' } },
      hex: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.16', n: 6 } },
      hexY: { type: 'fill', in: { geo: 'hex' }, params: { ink: 'yellow', mode: 'solid' }, when: '$core' },
      hexB: { type: 'stroke', in: { geo: 'hex' }, params: { ink: 'blue', mode: 'add', w: '$r*0.012' }, when: '$core' },
      hex2: { type: 'circle', params: { x: 0, y: 0, r: '$r*0.1', n: 6 } },
      hex2B: { type: 'stroke', in: { geo: 'hex2' }, params: { ink: 'blue', mode: 'add', w: '$r*0.008' }, when: '$core' },
      out: { type: 'merge', in: { list: ['haloS2', 'armS', 'hexY', 'hexB', 'hex2B'] } },
    },
    output: 'out',
  },
};

// ---- web flake: concentric hexagons and spokes ----
LIB.webflake = {
  label: 'Web flake',
  params: { x: Q(100, 0, 1080, 1), y: Q(180, 0, 1080, 1), r: Q(90, 10, 400, 1), rot: Q(0, -3.2, 3.2, 0.01), rings: Q(5, 1, 12, 1), spokes: Q(12, 3, 36, 1), width: Q(2.5, 0.5, 10, 0.1) },
  xf: { x: '$x', y: '$y', rot: '$rot' },
  graph: {
    nodes: {
      rings: { type: 'copy', params: { n: '$rings', scale: '(@i+1)/@n', rot: '@i*0.12' }, template: { nodes: { h: { type: 'circle', params: { x: 0, y: 0, r: '$r', n: 6 } } }, output: 'h' } },
      spokes: { type: 'rays', params: { x: 0, y: 0, a0: 0, a1: '360-360/$spokes', count: '$spokes', r0: 0, r1: '$r' } },
      all: { type: 'merge', in: { list: ['rings', 'spokes'] } },
      halo: { type: 'stroke', in: { geo: 'all' }, params: { ink: 'blue', mode: 'add', w: '$width+2' } },
      lines: { type: 'stroke', in: { geo: 'all' }, params: { ink: 'all', mode: 'cut', w: '$width' } },
      out: { type: 'merge', in: { list: ['halo', 'lines'] } },
    },
    output: 'out',
  },
};

export const world = LIB;
