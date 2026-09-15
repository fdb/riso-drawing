// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- campfireFlame: a tongued silhouette above a base point, swaying with time, roughened by hand ----
// Units: x in -1..1 times $w (half width), y in 0..-1 times $h (up). Two fills: the ink, then an optional second ink over it.
LIB.campfireFlame = {
  label: 'Flame',
  params: {
    x: Q(540, 0, 1080, 1), y: Q(800, 0, 1080, 1, 'base'), w: Q(180, 10, 500, 1, 'half width'), h: Q(480, 10, 900, 1, 'height'),
    ink: { def: 'pink', kind: 'ink' }, mode: { def: 'solid', kind: 'mode' }, tone: Q(1, 0, 1),
    ink2: { def: 'yellow', kind: 'ink' }, tone2: Q(0, 0, 1, 0.01, 'second ink tone (0 = none)'),
    sway: Q(14, 0, 80, 0.5, 'sway at the tips (px)'), speed: Q(3, 0, 10, 0.1), wobble: Q(6, 0, 40, 0.5), seed: Q(0, 0, 99, 1),
  },
  xf: { x: '$x', y: '$y' },
  graph: {
    nodes: {
      shape: { type: 'polygon', params: { pts: '-1*$w 0 -0.92*$w -0.18*$h -0.72*$w -0.46*$h -0.56*$w -0.28*$h -0.42*$w -0.72*$h -0.26*$w -0.46*$h -0.1*$w -1*$h 0.06*$w -0.58*$h 0.3*$w -0.82*$h 0.36*$w -0.5*$h 0.62*$w -0.56*$h 0.56*$w -0.3*$h 0.86*$w -0.4*$h 0.76*$w -0.16*$h 1*$w 0' } },
      swayed: { type: 'wrangle', in: { geo: 'shape' }, params: { x: '@x + $sway*sin(t*$speed + $seed + @x*0.01)*pow(-@y/$h, 1.5) + $sway*0.4*sin(t*$speed*1.7 + $seed*2 + @y*0.02)*pow(-@y/$h, 2)', y: '@y + $sway*0.3*sin(t*$speed*1.3 + $seed + @x*0.02)*pow(-@y/$h, 2)' } },
      rough: { type: 'hand', in: { geo: 'swayed' }, params: { step: 7, wobble: '$wobble', wave: 60, jitter: 0.8, press: 0, taper: 0, overshoot: 0, seed: '$seed' } },
      f1: { type: 'fill', in: { geo: 'rough' }, params: { ink: '$ink', mode: '$mode', tone: '$tone' } },
      f2: { type: 'fill', in: { geo: 'rough' }, params: { ink: '$ink2', mode: 'add', tone: '$tone2' }, when: '$tone2 > 0' },
      out: { type: 'merge', in: { list: ['f1', 'f2'] } },
    },
    output: 'out',
  },
};

export const campfireFlame = LIB.campfireFlame;
