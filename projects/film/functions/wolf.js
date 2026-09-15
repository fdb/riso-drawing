// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- wolf: sitting on a ridge, howling to the upper right, drawn in scene coordinates (nose near 490 150, paws at 910).
// Dark green silhouette, a yellow rim light along the muzzle and back, fur tufts along the neck ----
LIB.wolf = {
  label: 'Howling wolf',
  params: { x: Q(0, -1080, 1080, 1), y: Q(0, -1080, 1080, 1), scale: Q(1, 0.1, 4, 0.01), lift: Q(0, -20, 20, 0.1, 'head lift (px)') },
  xf: { x: '$x', y: '$y', scale: '$scale' },
  graph: {
    nodes: {
      // outline: nose, jaw, throat, chest, front leg, paws, along the bottom, up the left edge, back, neck, ear, forehead, muzzle
      body: { type: 'polygon', params: { pts: '492 148-$lift 480 200-$lift 452 226-$lift 418 238 382 262 366 296 342 352 340 420 372 452 404 500 420 560 418 700 412 880 452 898 460 914 300 914 250 906 200 912 120 900 60 896 -10 890 -10 664 40 640 110 590 170 530 200 480 215 400 228 330 252 300 244 262 230 218 266 236 296 244 322 234 352 216 392 196-$lift 442 172-$lift' } },
      bodyH: { type: 'hand', in: { geo: 'body' }, params: { step: 6, wobble: 2, wave: 40, jitter: 1.8, press: 0, taper: 0, overshoot: 0 } },
      bodyB: { type: 'fill', in: { geo: 'bodyH' }, params: { ink: 'blue', mode: 'solid' } },
      bodyY: { type: 'fill', in: { geo: 'bodyH' }, params: { ink: 'yellow', mode: 'add' } },
      bodyP: { type: 'fill', in: { geo: 'bodyH' }, params: { ink: 'pink', mode: 'add', tone: 0.75 } },
      specks: { type: 'scatter', in: { geo: 'bodyH' }, params: { count: 80 } },
      specksD: { type: 'dots', in: { geo: 'specks' }, params: { ink: 'blue', mode: 'cut', r: '0.8 + 1.5*rand(1)' } },
      // rim light: the muzzle top, and the back of the neck down to the rump
      rimTop: { type: 'polygon', params: { pts: '266 236 296 244 322 234 352 216 392 196-$lift 442 172-$lift 492 148-$lift', closed: 0 } },
      rimEar: { type: 'polygon', params: { pts: '252 300 244 262 230 218', closed: 0 } },
      rimBack: { type: 'polygon', params: { pts: '228 330 215 400 200 480 170 530 110 590 40 640 -10 664', closed: 0 } },
      rims: { type: 'merge', in: { list: ['rimTop', 'rimEar', 'rimBack'] } },
      rimsW: { type: 'wrangle', in: { geo: 'rims' }, params: { w: '5.5 - 3*abs(@v-0.5)' } },
      rimsH: { type: 'hand', in: { geo: 'rimsW' }, params: { step: 5, wobble: 1.5, wave: 40, jitter: 1, press: 0.5, taper: 0.5, overshoot: 0 } },
      rimsY: { type: 'stroke', in: { geo: 'rimsH' }, params: { ink: 'yellow', mode: 'solid' } },
      rimsG: { type: 'transform', in: { geo: 'rimsH' }, params: { x: 3, y: 4 } },
      rimsGS: { type: 'stroke', in: { geo: 'rimsG' }, params: { ink: 'blue', mode: 'add', w: 2, tone: 0.7 } },
      // tufts of fur standing off the neck and back
      tuftLine: { type: 'polygon', params: { pts: '228 330 215 400 200 480 170 530 110 590 40 640', closed: 0 } },
      tuftEven: { type: 'resample', in: { geo: 'tuftLine' }, params: { step: 14 } },
      tuftPts: { type: 'pointsAlong', in: { geo: 'tuftEven' }, params: { start: 0, step: 1 } },
      tufts: { type: 'copy', in: { points: 'tuftPts' }, params: { orient: 1, scale: '0.6 + 0.8*rand(1)', rot: '-0.3 + 0.6*rand(2)' }, template: { nodes: { l: { type: 'polygon', params: { pts: '0 0 -6 18 -4 30', closed: 0 } } }, output: 'l' } },
      tuftsW: { type: 'wrangle', in: { geo: 'tufts' }, params: { w: '4 - 3*@v' } },
      tuftsY: { type: 'stroke', in: { geo: 'tuftsW' }, params: { ink: 'yellow', mode: 'solid' } },
      tuftsB: { type: 'stroke', in: { geo: 'tuftsW' }, params: { ink: 'blue', mode: 'add', tone: 0.6 } },
      out: { type: 'merge', in: { list: ['bodyB', 'bodyY', 'bodyP', 'specksD', 'rimsGS', 'rimsY', 'tuftsY', 'tuftsB'] } },
    },
    output: 'out',
  },
};

export const wolf = LIB.wolf;
