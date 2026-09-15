// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- pines: tall spiky firs copied along a line, with a blue and a pink tone so a forest can print navy, purple or magenta ----
LIB.wolfPines = {
  label: 'Pine row',
  params: {
    x0: Q(-20, -200, 1080, 1), x1: Q(1100, 0, 1300, 1), y: Q(900, 0, 1200, 1, 'ground'), count: Q(40, 1, 300, 1),
    height: Q(200, 10, 600, 1), vary: Q(0.5, 0, 1, 0.01), slim: Q(0.5, 0.2, 1.5, 0.01, 'width factor'), seed: Q(1, 0, 99, 1),
    blue: Q(0.8, 0, 1, 0.01), pink: Q(1, 0, 1, 0.01), sway: Q(0, 0, 10, 0.1, 'tip sway (px)'),
  },
  graph: {
    nodes: {
      trees: { type: 'copy', params: { n: '$count', x: '$x0 + (@i+0.5)/@n*($x1-$x0) + (rand(1)-0.5)*($x1-$x0)/@n*1.6', y: '$y + rand(3)*$height*0.1', scale: '$height/200*(1-$vary+$vary*rand(2))' }, template: {
        let: { w: '$slim*(0.7+0.6*rand(4))', s: '$sway*sin(t*1.1 + rand(6)*6)' },
        nodes: {
          fir: { type: 'polygon', params: { pts: '0+$s -200 -8*$w -150 -4*$w -150 -14*$w -100 -8*$w -100 -20*$w -50 -12*$w -50 -26*$w 0 26*$w 0 12*$w -50 20*$w -50 8*$w -100 14*$w -100 4*$w -150 8*$w -150' } },
          rough: { type: 'hand', in: { geo: 'fir' }, params: { step: 5, wobble: 1.2, wave: 30, jitter: 0.8, press: 0, taper: 0, overshoot: 0 } },
        }, output: 'rough' } },
      cutY: { type: 'fill', in: { geo: 'trees' }, params: { ink: 'yellow', mode: 'cut' } },
      fb: { type: 'fill', in: { geo: 'trees' }, params: { ink: 'blue', mode: 'add', tone: '$blue' } },
      fp: { type: 'fill', in: { geo: 'trees' }, params: { ink: 'pink', mode: 'add', tone: '$pink' } },
      out: { type: 'merge', in: { list: ['cutY', 'fb', 'fp'] } },
    },
    output: 'out',
  },
};

export const wolfPines = LIB.wolfPines;
