// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- owl: face at the origin, chest below, one wing folded on the right. Red face, yellow eyes, halftone chest with feather marks ----
LIB.owl = {
  label: 'Owl',
  params: { x: Q(215, -1080, 1080, 1), y: Q(130, -1080, 1080, 1), scale: Q(1, 0.1, 4, 0.01), blink: Q(1, 0, 1, 0.01, 'eye size') },
  xf: { x: '$x', y: '$y', scale: '$scale' },
  graph: {
    let: { eyeR: '95*$blink' },
    nodes: {
      // body: chest column and the folded wing, over the yellow paper base
      chest: { type: 'polygon', params: { pts: '-260 120 250 130 300 260 300 1000 -260 1000' } },
      chestP: { type: 'field', params: { expr: 'clamp(0.15 + 0.18*lin(@x,@y,0,200,0,1000) + 0.12*(noise(@x,@y,60,4)-0.5))' } },
      chestT: { type: 'tint', in: { geo: 'chest', field: 'chestP' }, params: { ink: 'pink', cell: 6.5, angle: 0.5 } },
      chestBlue: { type: 'field', params: { expr: 'clamp(0.02 + 0.14*lin(@x,@y,0,300,0,1000))' } },
      chestB: { type: 'tint', in: { geo: 'chest', field: 'chestBlue' }, params: { ink: 'blue', cell: 6.5, angle: 0.26 } },
      featherPts: { type: 'polygon', params: { pts: '-260 330 90 340 130 1000 -260 1000' } },
      featherSc: { type: 'scatter', in: { geo: 'featherPts' }, params: { count: 190 } },
      feathers: { type: 'copy', in: { points: 'featherSc' }, params: { orient: 0, rot: '(rand(1)-0.5)*0.5', scale: '0.6 + 0.9*rand(2)' }, template: { nodes: {
        chev: { type: 'polygon', params: { pts: '-14 0 0 -7 14 0', closed: 0 } },
        dash: { type: 'polygon', params: { pts: '-12 0 12 -2', closed: 0 } },
        pick: { type: 'merge', in: { list: ['chev', 'dash'] } },
        one: { type: 'filter', in: { geo: 'pick' }, params: { expr: 'rand(5) < 0.5' } },
        w: { type: 'wrangle', in: { geo: 'one' }, params: { w: '3.5 + 2*sin(@v*PI)' } } }, output: 'w' } },
      feathersH: { type: 'hand', in: { geo: 'feathers' }, params: { step: 4, wobble: 0.8, wave: 30, jitter: 0.3, press: 0.3, taper: 0.3, overshoot: 0 } },
      feathersB: { type: 'stroke', in: { geo: 'feathersH' }, params: { ink: 'blue', mode: 'add' } },
      feathersP: { type: 'stroke', in: { geo: 'feathersH' }, params: { ink: 'pink', mode: 'add', tone: 0.8 } },
      wing: { type: 'ellipse', params: { x: 200, y: 640, rx: 92, ry: 420, rot: -0.04, n: 120 } },
      wingH: { type: 'hand', in: { geo: 'wing' }, params: { step: 8, wobble: 3, wave: 120, jitter: 0.6, press: 0, taper: 0, overshoot: 0 } },
      wingP: { type: 'fill', in: { geo: 'wingH' }, params: { ink: 'pink', mode: 'add' } },
      wingB: { type: 'fill', in: { geo: 'wingH' }, params: { ink: 'blue', mode: 'add', tone: 0.5 } },
      bars: { type: 'copy', params: { n: 9 }, template: { nodes: {
        l: { type: 'line', params: { x0: 105, y0: '330 + @i*76', x1: 300, y1: '330 + @i*76', n: 30 } },
        w: { type: 'wrangle', in: { geo: 'l' }, params: { y: '@y - 40*sin(@v*PI) + 8*@v', w: '10 + 6*rand(1) + 6*noise(@x,@i*50,60,2)' } } }, output: 'w' } },
      barsH: { type: 'hand', in: { geo: 'bars' }, params: { step: 5, wobble: 1.5, wave: 50, jitter: 0.5, press: 0.4, taper: 0.3, overshoot: 0 } },
      barsS: { type: 'stroke', in: { geo: 'barsH' }, params: { ink: 'blue', mode: 'add' } },
      barsC: { type: 'crop', in: { marks: 'barsS', geo: 'wingH' } },
      wingEdge: { type: 'ellipse', params: { x: 200, y: 640, rx: 92, ry: 420, rot: -0.04, a0: 100, a1: 260, n: 60 } },
      wingEdgeW: { type: 'wrangle', in: { geo: 'wingEdge' }, params: { w: 3 } },
      wingEdgeH: { type: 'hand', in: { geo: 'wingEdgeW' }, params: { step: 6, wobble: 1, wave: 80, jitter: 0.4, press: 0.3, taper: 0.4, overshoot: 0 } },
      wingEdgeS: { type: 'stroke', in: { geo: 'wingEdgeH' }, params: { ink: 'yellow', mode: 'solid' } },
      // cream bib under the face
      bib: { type: 'polygon', params: { pts: '-260 210 100 210 90 260 40 320 -40 340 -140 330 -220 300 -260 280' } },
      bibH: { type: 'hand', in: { geo: 'bib' }, params: { step: 7, wobble: 4, wave: 60, jitter: 1, press: 0, taper: 0, overshoot: 0 } },
      bibC: { type: 'fill', in: { geo: 'bibH' }, params: { ink: 'all', mode: 'cut' } },
      bibPts: { type: 'scatter', in: { geo: 'bibH' }, params: { count: 12 } },
      bibDots: { type: 'dots', in: { geo: 'bibPts' }, params: { ink: 'blue', mode: 'add', r: '1.5 + 2*rand(1)' } },
      // face
      face: { type: 'circle', params: { x: 0, y: 0, r: 250, n: 140 } },
      faceH: { type: 'hand', in: { geo: 'face' }, params: { step: 8, wobble: 3, wave: 150, jitter: 0.5, press: 0, taper: 0, overshoot: 0 } },
      faceP: { type: 'fill', in: { geo: 'faceH' }, params: { ink: 'pink', mode: 'solid' } },
      faceY: { type: 'fill', in: { geo: 'faceH' }, params: { ink: 'yellow', mode: 'add' } },
      faceBlue: { type: 'field', params: { expr: 'clamp(0.12 + 0.3*pow(clamp(dist(@x,@y,0,0)/250),2) + 0.15*(noise(@x,@y,50,7)-0.5))' } },
      faceB: { type: 'tint', in: { geo: 'faceH', field: 'faceBlue' }, params: { ink: 'blue', cell: 5.6, angle: 0.26 } },
      // eyes: yellow ring, dark iris, paper highlight; a white V between them
      brow: { type: 'polygon', params: { pts: '-120 -110 -60 10 0 -110', closed: 0 } },
      browW: { type: 'wrangle', in: { geo: 'brow' }, params: { w: '14 - 8*abs(@v-0.5)' } },
      browH: { type: 'hand', in: { geo: 'browW' }, params: { step: 6, wobble: 1, wave: 60, jitter: 0.4, press: 0.3, taper: 0.5, overshoot: 0 } },
      browS: { type: 'stroke', in: { geo: 'browH' }, params: { ink: 'all', mode: 'cut' } },
      eyePts: { type: 'polygon', params: { pts: '-170 -50 60 -20', closed: 0 } },
      eyes: { type: 'copy', in: { points: 'eyePts' }, params: { orient: 0 }, template: { nodes: {
        ring: { type: 'circle', params: { x: 0, y: 0, r: '$eyeR', n: 90 } },
        ringH: { type: 'hand', in: { geo: 'ring' }, params: { step: 6, wobble: 2, wave: 90, jitter: 0.5, press: 0, taper: 0, overshoot: 0 } } }, output: 'ringH' } },
      eyesY: { type: 'fill', in: { geo: 'eyes' }, params: { ink: 'yellow', mode: 'solid' } },
      irises: { type: 'copy', in: { points: 'eyePts' }, params: { orient: 0 }, template: { nodes: {
        c: { type: 'circle', params: { x: 0, y: 0, r: '$eyeR*0.7', n: 80 } },
        cH: { type: 'hand', in: { geo: 'c' }, params: { step: 6, wobble: 1.5, wave: 90, jitter: 0.4, press: 0, taper: 0, overshoot: 0 } } }, output: 'cH' } },
      irisF: { type: 'fill', in: { geo: 'irises' }, params: { ink: 'all', mode: 'add' } },
      irisRim: { type: 'stroke', in: { geo: 'irises' }, params: { ink: 'blue', mode: 'cut', w: 2.5, tone: 1 } },
      glints: { type: 'copy', in: { points: 'eyePts' }, params: { orient: 0, x: '-$eyeR*0.28', y: '-$eyeR*0.3' }, template: { nodes: { c: { type: 'circle', params: { x: 0, y: 0, r: '$eyeR*0.17', n: 30 } } }, output: 'c' } },
      glintsC: { type: 'fill', in: { geo: 'glints' }, params: { ink: 'all', mode: 'cut' } },
      // beak and the scratch marks below the face
      beak: { type: 'polygon', params: { pts: '-86 28 -44 32 -50 70 -66 140' } },
      beakF: { type: 'fill', in: { geo: 'beak' }, params: { ink: 'all', mode: 'add' } },
      beakRim: { type: 'stroke', in: { geo: 'beak' }, params: { ink: 'blue', mode: 'cut', w: 2 } },
      scratch: { type: 'polygon', params: { pts: '-130 100 -110 170 -100 240', closed: 0 } },
      scratch2: { type: 'polygon', params: { pts: '-70 120 -30 190 -10 230', closed: 0 } },
      scratch3: { type: 'polygon', params: { pts: '20 130 50 190 90 230', closed: 0 } },
      scratch4: { type: 'polygon', params: { pts: '-110 170 -70 250 -60 280', closed: 0 } },
      scratches: { type: 'merge', in: { list: ['scratch', 'scratch2', 'scratch3', 'scratch4'] } },
      scratchW: { type: 'wrangle', in: { geo: 'scratches' }, params: { w: '4 - 2*abs(@v-0.4)' } },
      scratchH: { type: 'hand', in: { geo: 'scratchW' }, params: { step: 5, wobble: 2, wave: 60, jitter: 0.4, press: 0.4, taper: 0.5, overshoot: 4 } },
      scratchS: { type: 'stroke', in: { geo: 'scratchH' }, params: { ink: 'blue', mode: 'add' } },
      scratchP: { type: 'stroke', in: { geo: 'scratchH' }, params: { ink: 'pink', mode: 'add', tone: 0.7 } },
      out: { type: 'merge', in: { list: ['chestT', 'chestB', 'feathersB', 'feathersP', 'wingP', 'wingB', 'barsC', 'wingEdgeS', 'bibC', 'bibDots', 'faceP', 'faceY', 'faceB', 'browS', 'eyesY', 'irisF', 'irisRim', 'glintsC', 'beakF', 'beakRim', 'scratchS', 'scratchP'] } },
    },
    output: 'out',
  },
};

export const owl = LIB.owl;
