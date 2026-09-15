// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- ridge: a mountain layer. A noise-displaced line closed down to a base, filled with halftone or solid ink ----
LIB.ridge = {
  label: 'Mountain ridge',
  params: {
    x0: Q(-20, -200, 1080, 1), x1: Q(1100, 0, 1300, 1), y: Q(500, 0, 1080, 1, 'ridge base'), bottom: Q(1080, 0, 1200, 1),
    amp: Q(120, 0, 500, 1, 'peak height'), scale: Q(220, 20, 800, 1, 'peak width'), seed: Q(1, 0, 99, 1), sharp: Q(1, 0, 1, 0.01, 'sharp peaks'),
    blue: Q(0.5, 0, 1.3), pink: Q(0.5, 0, 1.3), fade: Q(0, 0, 1, 0.01, 'lighter towards the top'), cell: Q(5.6, 2, 16, 0.1),
    detail: Q(0.35, 0, 1, 0.01, 'small crags'), rim: Q(0, 0, 8, 0.1, 'paper rim along the crest (px)'),
  },
  graph: {
    nodes: {
      base: { type: 'line', params: { x0: '$x0', y0: '$y', x1: '$x1', y1: '$y', n: 220 } },
      ridge: { type: 'wrangle', in: { geo: 'base' }, params: { y: '@y - $amp*((1 - $sharp*abs(2*noise(@x,0,$scale,$seed)-1) - (1-$sharp)*(1-noise(@x,0,$scale,$seed)))*(0.7+0.3*noise(@x,100,$scale*3,$seed+7)) + $detail*(noise(@x,7,$scale*0.23,$seed+3)-0.5) + $detail*0.4*(noise(@x,9,$scale*0.09,$seed+5)-0.5))' } },
      foot: { type: 'polygon', params: { pts: '$x1 $bottom $x0 $bottom', closed: 0 } },
      shape: { type: 'join', in: { list: ['ridge', 'foot'] }, params: { close: 1 } },
      fb: { type: 'field', params: { expr: 'clamp($blue*(1 - $fade*(1-lin(@x,@y,0,$y-$amp,0,$bottom))))' } },
      tb: { type: 'tint', in: { geo: 'shape', field: 'fb' }, params: { ink: 'blue', cell: '$cell', angle: 0.26 } },
      fp: { type: 'field', params: { expr: 'clamp($pink*(1 - $fade*(1-lin(@x,@y,0,$y-$amp,0,$bottom))))' } },
      tp: { type: 'tint', in: { geo: 'shape', field: 'fp' }, params: { ink: 'pink', cell: '$cell', angle: 0.26 } },
      cutY: { type: 'fill', in: { geo: 'shape' }, params: { ink: 'yellow', mode: 'cut' } },
      crest: { type: 'hand', in: { geo: 'ridge' }, params: { step: 5, wobble: 1.2, wave: 40, jitter: 0.4, press: 0.5, taper: 0, overshoot: 0 } },
      rimCut: { type: 'stroke', in: { geo: 'crest' }, params: { ink: 'all', mode: 'cut', w: '$rim' }, when: '$rim > 0' },
      out: { type: 'merge', in: { list: ['cutY', 'tb', 'tp', 'rimCut'] } },
    },
    output: 'out',
  },
};
LIB.ridge.graph.nodes.foot.params.pts = '$x1 $bottom $x0 $bottom';

export const ridge = LIB.ridge;
