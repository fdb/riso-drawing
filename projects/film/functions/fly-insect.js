// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- insect: a crane fly in silhouette, facing right. Origin at the thorax; wings swept back with paper veins ----
LIB.flyInsect = {
  label: 'Insect (crane fly)',
  params: { x: Q(540, 0, 1080, 1), y: Q(400, 0, 1080, 1), scale: Q(1, 0.1, 4, 0.01), rot: Q(0, -3.2, 3.2, 0.01), flutter: Q(1, 0, 3, 0.01, 'wing and antenna motion') },
  xf: { x: '$x', y: '$y', rot: '$rot', scale: '$scale' },
  graph: {
    let: { wa: '$flutter*0.03*sin(t*9)', an: '$flutter*0.04*sin(t*1.3)' },
    nodes: {
      abdomen: { type: 'ellipse', params: { x: -98, y: 14, rx: 100, ry: 26, rot: 0.1 } },
      thorax: { type: 'ellipse', params: { x: 0, y: 0, rx: 50, ry: 38, rot: -0.15 } },
      head: { type: 'circle', params: { x: 64, y: -6, r: 25 } },
      body: { type: 'merge', in: { list: ['abdomen', 'thorax', 'head'] } },
      bodyF: { type: 'fill', in: { geo: 'body' }, params: { ink: 'all', mode: 'add' } },
      wingA: { type: 'ellipse', params: { x: -84, y: -66, rx: 132, ry: 19, rot: '-0.4 + $wa' } },
      wingB: { type: 'ellipse', params: { x: -70, y: -44, rx: 120, ry: 16, rot: '-0.28 - $wa' } },
      wings: { type: 'merge', in: { list: ['wingA', 'wingB'] } },
      wingsF: { type: 'fill', in: { geo: 'wings' }, params: { ink: 'blue', mode: 'add' } },
      wingsP: { type: 'fill', in: { geo: 'wings' }, params: { ink: 'pink', mode: 'add', tone: 0.85 } },
      veins: { type: 'rays', params: { x: 20, y: -30, a0: '194 + $wa*57', a1: '208 + $wa*57', count: 5, r0: 40, r1: 240 } },
      veinsH: { type: 'hand', in: { geo: 'veins' }, params: { step: 6, wobble: 1, wave: 60, jitter: 0.3, press: 0.3, taper: 0, overshoot: 0 } },
      veinsS: { type: 'stroke', in: { geo: 'veinsH' }, params: { ink: 'blue', mode: 'cut' } },
      veinsC: { type: 'crop', in: { marks: 'veinsS', geo: 'wings' } },
      antenna: { type: 'polygon', params: { pts: '82 -14 130 -70 180 -140 230 -230', closed: 0 } },
      antW: { type: 'wrangle', in: { geo: 'antenna' }, params: { x: '@x + @v*@v*60*$an', y: '@y - @v*@v*40*$an', w: '3 - 2*@v' } },
      proboscis: { type: 'polygon', params: { pts: '80 8 104 34 112 58', closed: 0 } },
      legF: { type: 'polygon', params: { pts: '24 30 48 56 40 92 54 100', closed: 0 } },
      legM: { type: 'polygon', params: { pts: '-8 34 -20 70 -42 82 -34 100', closed: 0 } },
      legR: { type: 'polygon', params: { pts: '-40 30 -70 64 -120 82 -160 78', closed: 0 } },
      legR2: { type: 'polygon', params: { pts: '-46 34 -96 96 -150 118', closed: 0 } },
      legs: { type: 'merge', in: { list: ['proboscis', 'legF', 'legM', 'legR', 'legR2'] } },
      legsW: { type: 'wrangle', in: { geo: 'legs' }, params: { w: '3.2 - 1.6*@v' } },
      thin: { type: 'merge', in: { list: ['antW', 'legsW'] } },
      thinH: { type: 'hand', in: { geo: 'thin' }, params: { step: 5, wobble: 1, wave: 60, jitter: 0.3, press: 0.3, taper: 0.1, overshoot: 0 } },
      thinS: { type: 'stroke', in: { geo: 'thinH' }, params: { ink: 'all', mode: 'add' } },
      out: { type: 'merge', in: { list: ['wingsF', 'wingsP', 'veinsC', 'bodyF', 'thinS'] } },
    },
    output: 'out',
  },
};

export const flyInsect = LIB.flyInsect;
