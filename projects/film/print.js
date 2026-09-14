// print.js — the Riso print, as functions made of pixel blocks: one ink pass, and paper under
// three of them. Any project that wants this look imports it.

const LIB = {};
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });

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


export const print = LIB;
