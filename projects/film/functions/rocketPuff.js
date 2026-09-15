// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- puff: one cloud lobe. A bumpy hand-drawn ellipse cut to paper, blue halftone shade at the
// bottom and sides, warm (yellow + pink) halftone where light hits it, a blue pencil outline ----
LIB.rocketPuff = {
  label: 'Cloud puff',
  params: {
    x: Q(540, -200, 1300, 1), y: Q(540, -200, 1300, 1), rx: Q(120, 10, 400, 1), ry: Q(80, 10, 400, 1),
    blue: Q(0.5, 0, 1.2, 0.01, 'blue shade at the bottom'), warm: Q(0, 0, 1.2, 0.01, 'warm light'), line: Q(2.4, 0, 8, 0.1, 'outline width'),
    seed: Q(1, 0, 99, 1),
  },
  xf: { x: '$x', y: '$y' },
  graph: {
    nodes: {
      e: { type: 'ellipse', params: { x: 0, y: 0, rx: '$rx', ry: '$ry', n: 48 } },
      bump: { type: 'wrangle', in: { geo: 'e' }, params: { x: '@x*(1 + 0.09*(noise(@i*13+$seed*97, 0, 9, 3)-0.5)*2)', y: '@y*(1 + 0.09*(noise(@i*13+$seed*97, 50, 9, 3)-0.5)*2)', w: '$line' } },
      h: { type: 'hand', in: { geo: 'bump' }, params: { step: 6, wobble: 3, wave: 70, jitter: 0.5, press: 0.5, taper: 0, overshoot: 0, seed: '$seed' } },
      paper: { type: 'fill', in: { geo: 'h' }, params: { ink: 'all', mode: 'cut' } },
      fb: { type: 'field', params: { expr: 'clamp($blue*(1.7*lin(@x,@y,0,-$ry,0,$ry)-0.62) + $blue*0.35*pow(abs(@x)/$rx,3) + 0.16*(noise(@x,@y,35,$seed)-0.5))' } },
      tb: { type: 'tint', in: { geo: 'h', field: 'fb' }, params: { ink: 'blue', cell: '$cellBlue', angle: '$angleBlue*PI/180' } },
      fy: { type: 'field', params: { expr: 'clamp($warm*(1.3*lin(@x,@y,0,-$ry,0,$ry)-0.25) + 0.1*(noise(@x,@y,30,$seed+2)-0.5))' } },
      ty: { type: 'tint', in: { geo: 'h', field: 'fy' }, params: { ink: 'yellow', cell: '$cellYellow', angle: '$angleYellow*PI/180' } },
      fp: { type: 'field', params: { expr: 'clamp($warm*(1.2*lin(@x,@y,0,-$ry*0.2,0,$ry)-0.55))' } },
      tp: { type: 'tint', in: { geo: 'h', field: 'fp' }, params: { ink: 'pink', cell: '$cellPink', angle: '$anglePink*PI/180' } },
      edge: { type: 'stroke', in: { geo: 'h' }, params: { ink: 'blue', mode: 'add' }, when: '$line > 0' },
      out: { type: 'merge', in: { list: ['paper', 'tb', 'ty', 'tp', 'edge'] } },
    },
    output: 'out',
  },
};

export const rocketPuff = LIB.rocketPuff;
