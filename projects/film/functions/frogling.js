// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- frogling: a sitting frog seen from the side. Yellow body under a blue halftone makes the green; a yellow eye with
// a dark pupil, an ear disc, dark spots, and an orange throat sac (yellow under pink dots) that swells. Origin at the
// ground under the chin, facing right; flip: -1 mirrors it. ----
LIB.frogling = {
  label: 'Frog',
  params: {
    x: Q(540, 0, 1080, 1), y: Q(1080, 0, 1200, 1, 'ground'), s: Q(1, 0.1, 3, 0.01, 'scale'), flip: Q(1, -1, 1, 2, '1 faces right, -1 left'),
    green: Q(0.8, 0, 1.3, 0.01, 'blue over the yellow'), sac: Q(70, 0, 200, 1, 'throat sac radius'), swell: Q(0.06, 0, 0.3, 0.01),
    spots: Q(14, 0, 60, 1), cell: Q(6, 2, 16, 0.1), seed: Q(1, 0, 99, 1),
  },
  xf: { x: '$x', y: '$y', scale: '$s' },
  graph: {
    let: { sacR: '$sac*(1 + $swell*sin(t*2.6 + $seed))' },
    nodes: {
      // the body: haunch at the back, a rounded back up to the head, snout, chin, front leg
      bodyP: { type: 'polygon', params: { pts: '-405 30 -425 10 -395 -12 -345 -28 -335 -70 -365 -125 -345 -185 -300 -222 -245 -236 -190 -238 -140 -240 -100 -246 -60 -250 -20 -240 20 -228 38 -222 54 -200 60 -178 55 -162 35 -150 0 -140 -40 -125 -65 -95 -75 -50 -70 30' } },
      bodyH: { type: 'hand', in: { geo: 'bodyP' }, params: { step: 7, wobble: 2.5, wave: 90, jitter: 0.5, press: 0, taper: 0, overshoot: 0, seed: '$seed' } },
      body: { type: 'transform', in: { geo: 'bodyH' }, params: { sx: '$flip' } },
      bodyY: { type: 'fill', in: { geo: 'body' }, params: { ink: 'yellow', mode: 'solid' } },
      fg: { type: 'field', params: { expr: 'clamp($green*(0.85 + 0.3*noise(@x,@y,40,$seed)) + 0.25*clamp(lin(@x,@y,0,-200,0,20)))' } },
      bodyB: { type: 'tint', in: { geo: 'body', field: 'fg' }, params: { ink: 'blue', cell: '$cell', angle: 0.3 } },
      // a darker belly shadow: pink dots low on the body
      fs: { type: 'field', params: { expr: '0.45*clamp(lin(@x,@y,0,-150,0,10))' } },
      bodyS: { type: 'tint', in: { geo: 'body', field: 'fs' }, params: { ink: 'pink', cell: '$cell', angle: 0.8 } },
      // spots along the back
      spotPts: { type: 'scatter', in: { geo: 'bodyP' }, params: { count: '$spots' } },
      spotsF: { type: 'transform', in: { geo: 'spotPts' }, params: { sx: '$flip' } },
      spotB: { type: 'dots', in: { geo: 'spotsF' }, params: { ink: 'blue', mode: 'add', r: '4+6*rand(1)' } },
      spotP: { type: 'dots', in: { geo: 'spotsF' }, params: { ink: 'pink', mode: 'add', tone: 0.8, r: '4+6*rand(1)' } },
      // eye: yellow disc, dark pupil, paper glint; the ear behind it
      eyeC: { type: 'circle', params: { x: -50, y: -264, r: 36, n: 48 } },
      eyeH: { type: 'hand', in: { geo: 'eyeC' }, params: { step: 5, wobble: 1, wave: 40, jitter: 0.4, press: 0, taper: 0, overshoot: 0 } },
      earC: { type: 'circle', params: { x: -135, y: -192, r: 16, n: 32 } },
      eyes: { type: 'merge', in: { list: ['eyeH', 'earC'] } },
      eyesF: { type: 'transform', in: { geo: 'eyes' }, params: { sx: '$flip' } },
      eyeY: { type: 'fill', in: { geo: 'eyesF' }, params: { ink: 'yellow', mode: 'solid' } },
      pupilC: { type: 'circle', params: { x: -50, y: -274, r: 11, n: 32 } },
      earP: { type: 'circle', params: { x: -138, y: -195, r: 6, n: 24 } },
      pupils: { type: 'merge', in: { list: ['pupilC', 'earP'] } },
      pupilsF: { type: 'transform', in: { geo: 'pupils' }, params: { sx: '$flip' } },
      ringS: { type: 'stroke', in: { geo: 'eyesF' }, params: { ink: 'blue', mode: 'add', w: 6 } },
      ringP: { type: 'stroke', in: { geo: 'eyesF' }, params: { ink: 'pink', mode: 'add', w: 6 } },
      ringY: { type: 'stroke', in: { geo: 'eyesF' }, params: { ink: 'yellow', mode: 'add', w: 6 } },
      mouthP: { type: 'polygon', params: { pts: '-120 -168 -60 -172 0 -168 40 -164 55 -162', closed: 0 } },
      mouthH: { type: 'hand', in: { geo: 'mouthP' }, params: { step: 6, wobble: 1, wave: 60, jitter: 0.3, press: 0.4, taper: 0.6, overshoot: 0 } },
      mouthW: { type: 'wrangle', in: { geo: 'mouthH' }, params: { w: '@pw*2.6' } },
      mouthF: { type: 'transform', in: { geo: 'mouthW' }, params: { sx: '$flip' } },
      mouthB: { type: 'stroke', in: { geo: 'mouthF' }, params: { ink: 'blue', mode: 'add' } },
      mouthK: { type: 'stroke', in: { geo: 'mouthF' }, params: { ink: 'pink', mode: 'add', tone: 0.8 } },
      pupilB: { type: 'fill', in: { geo: 'pupilsF' }, params: { ink: 'blue', mode: 'add' } },
      pupilP: { type: 'fill', in: { geo: 'pupilsF' }, params: { ink: 'pink', mode: 'add' } },
      pupilY: { type: 'fill', in: { geo: 'pupilsF' }, params: { ink: 'yellow', mode: 'add' } },
      glintPt: { type: 'point', params: { x: '-42*$flip', y: -282 } },
      glint: { type: 'dots', in: { geo: 'glintPt' }, params: { ink: 'all', mode: 'cut', r: 5 } },
      // throat sac: yellow disc under a pink dot field, so it prints orange, darker at the rim
      sacC: { type: 'circle', params: { x: '8*$flip', y: '-$sacR - 10', r: '$sacR', n: 64 } },
      sacH: { type: 'hand', in: { geo: 'sacC' }, params: { step: 6, wobble: 1.5, wave: 60, jitter: 0.5, press: 0, taper: 0, overshoot: 0, seed: '$seed' } },
      sacY: { type: 'fill', in: { geo: 'sacH' }, params: { ink: 'yellow', mode: 'solid' } },
      fsac: { type: 'field', params: { expr: 'clamp(0.35 + 0.55*(1 - radial(@x,@y,8*$flip - 15*$flip,-$sacR - 25,$sacR*1.1)) + 0.2*(noise(@x,@y,30,$seed+3)-0.5))' } },
      sacP: { type: 'tint', in: { geo: 'sacH', field: 'fsac' }, params: { ink: 'pink', cell: '$cell', angle: 0.3 } },
      out: { type: 'merge', in: { list: ['bodyY', 'bodyB', 'bodyS', 'spotB', 'spotP', 'eyeY', 'ringS', 'ringP', 'ringY', 'mouthB', 'mouthK', 'pupilB', 'pupilP', 'pupilY', 'glint', 'sacY', 'sacP'] } },
    },
    output: 'out',
  },
};

export const frogling = LIB.frogling;
