import { LIB } from './graph.js';

// library.js — subnets. Each is pure data: a parameter schema, an optional transform, and a graph of
// catalog nodes. Nothing here draws; it only builds geometry, fields and marks.

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
      raysClip: { type: 'clip', in: { marks: ['raysS', 'raysHl'], geo: 'inner' } },
      innerClip: { type: 'clip', in: { marks: ['innerCut', 'pinkT', 'yelT', 'raysClip'], geo: 'bell' } },
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

// ---- one Riso ink: register the stencil, halftone it, add grain, turn coverage into ink ----
LIB.risoInk = {
  label: 'Riso ink',
  inputs: ['stencils'],
  params: {
    ink: { def: 'blue', kind: 'ink' }, color: { def: '#0078bf', kind: 'color' },
    cell: Q(5.6, 2, 16, 0.1, 'screen cell'), angle: Q(15, 0, 90, 1, 'screen angle (deg)'),
    shiftX: Q(0, -8, 8, 0.1, 'registration x'), shiftY: Q(0, -8, 8, 0.1, 'registration y'), rot: Q(0, -0.01, 0.01, 0.0002, 'plate rotation (rad)'),
    density: Q(0.94, 0.3, 1), mottle: Q(0.2, 0, 0.8), speckle: Q(0.035, 0, 0.3, 0.005), edgeNoise: Q(0.06, 0, 0.4), softness: Q(0.14, 0.02, 0.5),
    grainSeed: Q(7, 0, 9999, 1),
  },
  graph: {
    nodes: {
      src: { type: 'input', params: { name: 'stencils' } },
      st: { type: 'stencil', in: { stencils: 'src' }, params: { ink: '$ink' } },
      reg: { type: 'shift', in: { image: 'st' }, params: { x: '$shiftX', y: '$shiftY', rot: '$rot' } },
      // tone: the stencil modulated by slow mottle, plus fine grain at the dot edges
      mot: { type: 'noise', params: { scale: 110, seed: '$grainSeed' } },
      motTone: { type: 'remap', in: { image: 'mot' }, params: { lo: '1-0.6*$mottle', hi: '1+0.6*$mottle' } },
      tone: { type: 'multiply', in: { list: ['reg', 'motTone'] } },
      grain: { type: 'random', params: { size: 1, seed: '$grainSeed' } },
      edge: { type: 'remap', in: { image: 'grain' }, params: { lo: '-$edgeNoise/2', hi: '$edgeNoise/2' } },
      tone2: { type: 'add', in: { list: ['tone', 'edge'] } },
      // halftone: tone against the dot screen; solid areas stay solid
      scr: { type: 'screen', params: { cell: '$cell', angle: '$angle' } },
      dots: { type: 'compare', in: { a: 'tone2', b: 'scr' }, params: { softness: '$softness' } },
      solidAt: { type: 'constant', params: { value: 0.97 } },
      solid: { type: 'compare', in: { a: 'reg', b: 'solidAt' }, params: { softness: 0.01 } },
      halftone: { type: 'max', in: { list: ['dots', 'solid'] } },
      // no ink where the stencil is empty, whatever the grain says
      emptyAt: { type: 'constant', params: { value: 0.02 } },
      gate: { type: 'compare', in: { a: 'reg', b: 'emptyAt' }, params: { softness: 0.01 } },
      // coverage: ink density, uneven ink, speckle holes
      dens: { type: 'constant', params: { value: '$density' } },
      motDens: { type: 'remap', in: { image: 'mot' }, params: { lo: '1-$mottle', hi: 1 } },
      grainDens: { type: 'remap', in: { image: 'grain' }, params: { lo: 0.92, hi: 1 } },
      cov: { type: 'multiply', in: { list: ['halftone', 'gate', 'dens', 'motDens', 'grainDens'] } },
      spec: { type: 'random', params: { size: 2, seed: '$grainSeed+1' } },
      specAt: { type: 'constant', params: { value: '$speckle' } },
      specMask: { type: 'compare', in: { a: 'specAt', b: 'spec' }, params: { softness: 0.001 } },
      specGain: { type: 'remap', in: { image: 'specMask' }, params: { lo: 1, hi: 0.45 } },
      cov2: { type: 'multiply', in: { list: ['cov', 'specGain'] } },
      out: { type: 'ink', in: { image: 'cov2' }, params: { color: '$color' } },
    },
    output: 'out',
  },
};

// ---- the print: paper under three inks, multiplied ----
LIB.risoPrint = {
  label: 'Riso print',
  inputs: ['stencils'],
  params: {
    paperColor: { def: '#f3efe6', kind: 'color' }, fibres: Q(1, 0, 3, 0.1, 'paper fibres'),
    blueColor: { def: '#0078bf', kind: 'color' }, pinkColor: { def: '#ff48b0', kind: 'color' }, yellowColor: { def: '#ffe800', kind: 'color' },
    blueCell: Q(5.6, 2, 16, 0.1), pinkCell: Q(5.2, 2, 16, 0.1), yellowCell: Q(6.2, 2, 16, 0.1),
    blueAngle: Q(15, 0, 90, 1), pinkAngle: Q(45, 0, 90, 1), yellowAngle: Q(0, 0, 90, 1),
    pinkRegX: Q(1.8, -8, 8, 0.1, 'pink shift x'), pinkRegY: Q(1.1, -8, 8, 0.1, 'pink shift y'),
    yellowRegX: Q(-1.6, -8, 8, 0.1, 'yellow shift x'), yellowRegY: Q(1.8, -8, 8, 0.1, 'yellow shift y'),
    regRot: Q(1.2, 0, 8, 0.1, 'plate rotation (mrad)'),
    density: Q(0.94, 0.3, 1, 0.01, 'ink density'), mottle: Q(0.2, 0, 0.8, 0.01, 'ink mottle'), speckle: Q(0.035, 0, 0.3, 0.005),
    edgeNoise: Q(0.06, 0, 0.4, 0.01, 'edge noise'), softness: Q(0.14, 0.02, 0.5, 0.01, 'dot softness'),
    tremor: Q(0, 0, 1, 1, 'tremor: new grain every frame'),
  },
  graph: {
    let: { seed: '$tremor ? 7 + f : 7' },   // f is only read when tremor is on, so the grain stays cached otherwise
    nodes: {
      src: { type: 'input', params: { name: 'stencils' } },
      paper: { type: 'paper', params: { color: '$paperColor', fibres: '$fibres' } },
      blue: { type: 'risoInk', in: { stencils: 'src' }, params: { ink: 'blue', color: '$blueColor', cell: '$blueCell', angle: '$blueAngle', shiftX: 0, shiftY: 0, rot: 0,
        density: '$density', mottle: '$mottle', speckle: '$speckle', edgeNoise: '$edgeNoise', softness: '$softness', grainSeed: '$seed' } },
      pink: { type: 'risoInk', in: { stencils: 'src' }, params: { ink: 'pink', color: '$pinkColor', cell: '$pinkCell', angle: '$pinkAngle', shiftX: '$pinkRegX', shiftY: '$pinkRegY', rot: '$regRot/1000',
        density: '$density', mottle: '$mottle', speckle: '$speckle', edgeNoise: '$edgeNoise', softness: '$softness', grainSeed: '$seed+100' } },
      yellow: { type: 'risoInk', in: { stencils: 'src' }, params: { ink: 'yellow', color: '$yellowColor', cell: '$yellowCell', angle: '$yellowAngle', shiftX: '$yellowRegX', shiftY: '$yellowRegY', rot: '-$regRot/1000',
        density: '$density', mottle: '$mottle', speckle: '$speckle', edgeNoise: '$edgeNoise', softness: '$softness', grainSeed: '$seed+200' } },
      out: { type: 'multiply', in: { list: ['paper', 'blue', 'pink', 'yellow'] } },
    },
    output: 'out',
  },
};
