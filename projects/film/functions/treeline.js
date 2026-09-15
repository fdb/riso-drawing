// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- treeline: firs copied along a line, as solid dark ink or as a paper cut (fog) ----
LIB.treeline = {
  label: 'Treeline',
  params: {
    x0: Q(-20, -200, 1080, 1), x1: Q(1100, 0, 1300, 1), y: Q(700, 0, 1080, 1, 'ground'), bottom: Q(1080, 0, 1200, 1),
    count: Q(40, 1, 300, 1), height: Q(90, 10, 400, 1), vary: Q(0.5, 0, 1, 0.01), seed: Q(1, 0, 99, 1),
    mode: { def: 'add', kind: 'mode', label: 'add (dark) | cut (fog)' },
  },
  graph: {
    nodes: {
      trees: { type: 'copy', params: { n: '$count', x: '$x0 + (@i+0.5)/@n*($x1-$x0) + (rand(1)-0.5)*($x1-$x0)/@n*1.4', y: '$y + rand(3)*$height*0.15', scale: '$height/120*(1-$vary+$vary*rand(2))' }, template: {
        let: { k: 'floor(rand(9)*3)' },
        nodes: {
          fir: { type: 'polygon', params: { pts: '0 -120 -13 -80 -6 -80 -19 -42 -9 -42 -25 0 25 0 9 -42 19 -42 6 -80 13 -80' }, when: '$k == 0' },
          slim: { type: 'polygon', params: { pts: '0 -140 -8 -100 -4 -100 -12 -60 -6 -60 -16 -20 -18 0 18 0 16 -20 6 -60 12 -60 4 -100 8 -100' }, when: '$k == 1' },
          bushy: { type: 'polygon', params: { pts: '0 -100 -16 -70 -8 -70 -24 -36 -12 -36 -30 0 30 0 12 -36 24 -36 8 -70 16 -70' }, when: '$k == 2' },
          shape: { type: 'merge', in: { list: ['fir', 'slim', 'bushy'] } },
          rough: { type: 'hand', in: { geo: 'shape' }, params: { step: 6, wobble: 1.5, wave: 30, jitter: 0.6, press: 0, taper: 0, overshoot: 0 } },
        }, output: 'rough' } },
      ground: { type: 'polygon', params: { pts: '$x0 $y $x1 $y $x1 $bottom $x0 $bottom' } },
      all: { type: 'merge', in: { list: ['trees', 'ground'] } },
      fb: { type: 'fill', in: { geo: 'all' }, params: { ink: 'blue', mode: '$mode' } },
      fp: { type: 'fill', in: { geo: 'all' }, params: { ink: 'pink', mode: '$mode' } },
      fy: { type: 'fill', in: { geo: 'all' }, params: { ink: 'yellow', mode: 'cut' } },
      out: { type: 'merge', in: { list: ['fy', 'fb', 'fp'] } },
    },
    output: 'out',
  },
};
LIB.treeline.graph.nodes.ground.params.pts = '$x0 $y $x1 $y $x1 $bottom $x0 $bottom';

export const treeline = LIB.treeline;
