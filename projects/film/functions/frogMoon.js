// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- frogMoon: a solid yellow disc with a hand-drawn rim; craters are pink halftone patches, and a pink dusting at the edge ----
LIB.frogMoon = {
  label: 'Full moon',
  params: {
    x: Q(540, 0, 1080, 1), y: Q(540, 0, 1080, 1), r: Q(400, 10, 700, 1),
    craters: Q(0.6, 0, 1, 0.01, 'crater tone'), scale: Q(150, 20, 600, 1, 'noise crater size'), seed: Q(3, 0, 99, 1),
    rim: Q(0.4, 0, 1, 0.01, 'pink dusting at the rim'), cell: Q(7, 2, 16, 0.1),
  },
  graph: {
    nodes: {
      disc: { type: 'circle', params: { x: '$x', y: '$y', r: '$r', n: 180 } },
      discH: { type: 'hand', in: { geo: 'disc' }, params: { step: 8, wobble: 4, wave: 220, jitter: 0.6, press: 0, taper: 0, overshoot: 0 } },
      body: { type: 'fill', in: { geo: 'discH' }, params: { ink: 'yellow', mode: 'solid' } },
      // craters: blobs of noise cut off at a threshold so each patch has an edge, denser where the blobs sit
      // craters: three ragged patches (upper left with a lobe, right rim, lower right) placed in units of r, plus sparse
      // noise craters; a noise term tears the edges
      fc: { type: 'field', params: { expr: 'clamp($craters * max(clamp((0.95*radial(@x,@y,$x-$r*0.53,$y-$r*0.63,$r*0.42) + 0.8*radial(@x,@y,$x-$r*0.48,$y-$r*0.95,$r*0.22) + 0.9*radial(@x,@y,$x+$r*0.69,$y-$r*0.2,$r*0.22) + 0.85*radial(@x,@y,$x+$r*0.44,$y+$r*0.15,$r*0.13) + 0.4*(noise(@x,@y,55,$seed+4)-0.5) - 0.4)*6), 0.7*clamp((noise(@x,@y,$scale,$seed)*0.7 + noise(@x,@y,$scale*0.35,$seed+1)*0.3 - 0.74)*6))) + $rim*clamp((dist(@x,@y,$x,$y)/$r - 0.8)*4)*(0.5+0.5*noise(@x,@y,60,$seed+2))' } },
      craters: { type: 'tint', in: { geo: 'discH', field: 'fc' }, params: { ink: 'pink', cell: '$cell', angle: 0.5 } },
      out: { type: 'merge', in: { list: ['body', 'craters'] } },
    },
    output: 'out',
  },
};

export const frogMoon = LIB.frogMoon;
