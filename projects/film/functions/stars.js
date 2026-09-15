// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- stars: paper knockouts, yellow specks, a few glowing ones ----
LIB.stars = {
  label: 'Stars',
  params: { cx: Q(660, 0, 1080, 1), cy: Q(535, 0, 1080, 1), r: Q(318, 10, 600, 1), count: Q(260, 0, 600, 1), size: Q(1, 0.3, 3, 0.05),
    glow: Q(10, 0, 30, 1, 'glowing stars'), twinkle: Q(0.3, 0, 1, 0.01) },
  graph: {
    nodes: {
      pts: { type: 'scatter', params: { x: '$cx', y: '$cy', r: '$r-14', count: '$count' } },
      cut: { type: 'dots', in: { geo: 'pts' }, params: { ink: 'all', mode: 'cut', r: '(rand(1)<0.1 ? 2.6+1.2*rand(2) : 1.1+1.2*rand(2))*$size*(1-$twinkle*0.5+$twinkle*0.5*sin(t*4+@i*1.7))' } },
      ypts: { type: 'scatter', params: { x: '$cx', y: '$cy', r: '$r-14', count: 40 } },
      ydots: { type: 'dots', in: { geo: 'ypts' }, params: { ink: 'yellow', mode: 'add', r: '(1.5+1.5*rand(1))*$size' } },
      gpts: { type: 'scatter', params: { x: '$cx', y: '$cy', r: '$r-30', count: '$glow' } },
      gGlow: { type: 'glow', in: { geo: 'gpts' }, params: { ink: 'yellow', tone: 0.8, r: '(8+6*rand(1))*(1-$twinkle*0.4+$twinkle*0.4*sin(t*3+@i*2.3))' } },
      gCut1: { type: 'dots', in: { geo: 'gpts' }, params: { ink: 'blue', mode: 'cut', r: '3+2*rand(2)' } },
      gCut2: { type: 'dots', in: { geo: 'gpts' }, params: { ink: 'all', mode: 'cut', r: '1.8+0.8*rand(3)' } },
      out: { type: 'merge', in: { list: ['cut', 'ydots', 'gGlow', 'gCut1', 'gCut2'] } },
    },
    output: 'out',
  },
};

export const stars = LIB.stars;
