// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- trumpet: a pink trumpet flower. The tube runs from -x to the mouth at the origin, opening along +x ----
LIB.trumpet = {
  label: 'Trumpet flower',
  params: { x: Q(500, 0, 1080, 1), y: Q(500, 0, 1080, 1), rot: Q(0, -6.3, 6.3, 0.01), size: Q(100, 10, 400, 1), seed: Q(1, 0, 99, 1) },
  xf: { x: '$x', y: '$y', rot: '$rot' },
  graph: {
    let: { s: '$size' },
    nodes: {
      shape: { type: 'polygon', params: { pts: '-$s*1.3 -$s*0.1 -$s*0.7 -$s*0.16 -$s*0.3 -$s*0.3 -$s*0.05 -$s*0.52 $s*0.18 -$s*0.4 $s*0.28 -$s*0.12 $s*0.28 $s*0.12 $s*0.18 $s*0.4 -$s*0.05 $s*0.52 -$s*0.3 $s*0.3 -$s*0.7 $s*0.16 -$s*1.3 $s*0.1' } },
      rough: { type: 'hand', in: { geo: 'shape' }, params: { step: 6, wobble: '$s*0.02', wave: 60, jitter: 0.5, press: 0, taper: 0, overshoot: 0, seed: '$seed' } },
      fp: { type: 'fill', in: { geo: 'rough' }, params: { ink: 'pink', mode: 'solid' } },
      // paper light along the tube's top edge, blue shade below
      liteF: { type: 'field', params: { expr: 'clamp(0.5 - 0.9*lin(@x,@y,0,-$s*0.4,0,$s*0.3))' } },
      lite: { type: 'tint', in: { geo: 'rough', field: 'liteF' }, params: { ink: 'yellow', cell: 5, angle: 0.3 } },
      shadeF: { type: 'field', params: { expr: 'clamp(-0.2 + 0.8*lin(@x,@y,0,-$s*0.2,0,$s*0.5))' } },
      shade: { type: 'tint', in: { geo: 'rough', field: 'shadeF' }, params: { ink: 'blue', cell: 5.5, angle: 0.5 } },
      // the mouth: a darker ellipse, seen at an angle, with a deep blue throat
      mouth: { type: 'ellipse', params: { x: '$s*0.1', y: 0, rx: '$s*0.16', ry: '$s*0.44', n: 32 } },
      mouthH: { type: 'hand', in: { geo: 'mouth' }, params: { step: 5, wobble: '$s*0.015', wave: 40, jitter: 0.4, press: 0, taper: 0, overshoot: 0, seed: '$seed' } },
      mouthP: { type: 'fill', in: { geo: 'mouthH' }, params: { ink: 'pink', mode: 'solid' } },
      mouthBF: { type: 'field', params: { expr: 'clamp(0.75*radial(@x,@y,$s*0.08,0,$s*0.4))' } },
      mouthB: { type: 'tint', in: { geo: 'mouthH', field: 'mouthBF' }, params: { ink: 'blue', cell: 5, angle: 0.5 } },
      // thin green creases along the tube
      creases: { type: 'copy', params: { n: 3, y: '(@i-1)*$s*0.14' }, template: { nodes: { l: { type: 'line', params: { x0: '-$s*1.1', y0: '(@i-1)*$s*0.02', x1: '-$s*0.2', y1: 0, n: 6 } } }, output: 'l' } },
      creasesH: { type: 'hand', in: { geo: 'creases' }, params: { step: 5, wobble: 1, wave: 50, jitter: 0.4, press: 0.4, taper: 0.5, overshoot: 0, seed: '$seed' } },
      creasesS: { type: 'stroke', in: { geo: 'creasesH' }, params: { ink: 'blue', mode: 'add', w: 1.6, tone: 0.8 } },
      // the calyx: a small green cup at the tube's end
      calyx: { type: 'polygon', params: { pts: '-$s*1.45 -$s*0.05 -$s*1.2 -$s*0.16 -$s*1.05 0 -$s*1.2 $s*0.16 -$s*1.45 $s*0.05' } },
      calyxY: { type: 'fill', in: { geo: 'calyx' }, params: { ink: 'yellow', mode: 'solid' } },
      calyxB: { type: 'fill', in: { geo: 'calyx' }, params: { ink: 'blue', mode: 'add', tone: 0.7 } },
      out: { type: 'merge', in: { list: ['calyxY', 'calyxB', 'fp', 'lite', 'shade', 'creasesS', 'mouthP', 'mouthB'] } },
    },
    output: 'out',
  },
};

export const trumpet = LIB.trumpet;
