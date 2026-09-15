// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- burst: a firework. Rays with knobbed tips, a shorter inner crown, flecks, a hanging trail ----
LIB.burst = {
  label: 'Firework burst',
  params: {
    x: Q(300, 0, 1080, 1), y: Q(300, 0, 1080, 1), r: Q(130, 10, 400, 1), ink: { def: 'yellow', kind: 'ink' }, mode: { def: 'solid', kind: 'mode' },
    rays: Q(70, 6, 200, 1), crown: Q(1, 0, 1, 0.01, 'inner crown density'), knob: Q(1, 0, 3, 0.05, 'tip size'), trail: Q(1, 0, 4, 0.05, 'trail length (× r)'),
    grow: Q(1, 0, 1, 0.01, 'growth 0..1'), bend: Q(1, 0, 3, 0.05, 'hand-drawn bend'), droop: Q(1, 0, 3, 0.05, 'rays sag at the tips'),
    tone: Q(1, 0, 1, 0.01, 'ink tone (below 1 the rays print as dots)'),
  },
  xf: { x: '$x', y: '$y' },
  graph: {
    let: { R: '$r*(0.6+0.4*$grow)' },
    nodes: {
      // each ray is its own curve: a random sideways bend, a sag towards the tip, thicker outward
      rays: { type: 'copy', params: { n: '$rays' }, template: {
        let: { a: '@i/@n*TAU + (rand(1)-0.5)*0.06', len: '$R*(0.7+0.3*rand(2))', bv: '$R*$bend*(rand(3)-0.5)*0.12', sag: '$droop*$R*0.06*(0.5+rand(4))' },
        nodes: {
          ln: { type: 'line', params: { x0: 'cos($a)*$R*0.16', y0: 'sin($a)*$R*0.16', x1: 'cos($a)*$len', y1: 'sin($a)*$len', n: 12 } },
          w: { type: 'wrangle', in: { geo: 'ln' }, params: { x: '@x + cos($a+PI/2)*sin(@v*PI)*$bv', y: '@y + sin($a+PI/2)*sin(@v*PI)*$bv + $sag*@v*@v', w: '$R*0.017*(0.6+0.6*@v)' } },
        }, output: 'w' } },
      raysH: { type: 'hand', in: { geo: 'rays' }, params: { step: 5, wobble: '$R*0.012', wave: 60, jitter: 0.5, press: 0.3, taper: 0.15, overshoot: 0 } },
      raysS: { type: 'stroke', in: { geo: 'raysH' }, params: { ink: '$ink', mode: '$mode', tone: '$tone' } },
      tips: { type: 'slice', in: { geo: 'rays' }, params: { start: 11 } },
      tipsD: { type: 'dots', in: { geo: 'tips' }, params: { ink: '$ink', mode: '$mode', tone: '$tone', r: '$R*0.022*$knob*(0.6+0.8*rand(1))' } },
      crown: { type: 'copy', params: { n: 'round($rays*0.9*$crown)' }, template: {
        let: { a: '@i/@n*TAU + rand(1)*0.1', len: '$R*(0.3+0.25*rand(2))' },
        nodes: { ln: { type: 'line', params: { x0: 'cos($a)*$R*0.17', y0: 'sin($a)*$R*0.17', x1: 'cos($a)*$len', y1: 'sin($a)*$len', n: 2 } },
          w: { type: 'wrangle', in: { geo: 'ln' }, params: { w: '$R*0.014' } } }, output: 'w' } },
      crownH: { type: 'hand', in: { geo: 'crown' }, params: { step: 4, wobble: '$R*0.01', wave: 40, jitter: 0.5, press: 0.3, taper: 0.1, overshoot: 0 } },
      crownS: { type: 'stroke', in: { geo: 'crownH' }, params: { ink: '$ink', mode: '$mode', tone: '$tone' } },
      fleckPts: { type: 'scatter', params: { x: 0, y: 0, r: '$R*0.95', count: 'round($rays*1.0)' } },
      corePts: { type: 'scatter', params: { x: 0, y: 0, r: '$R*0.2', count: 'round($rays*0.5)' } },
      core: { type: 'dots', in: { geo: 'corePts' }, params: { ink: 'all', mode: 'cut', r: '$R*0.01*(0.4+rand(1))' } },
      flecks: { type: 'dots', in: { geo: 'fleckPts' }, params: { ink: '$ink', mode: '$mode', tone: '$tone', r: '$R*0.012*(0.4+rand(1))' } },
      sparklePts: { type: 'scatter', params: { x: 0, y: 0, r: '$R*0.85', count: 'round($rays*0.9)' } },
      sparkles: { type: 'dots', in: { geo: 'sparklePts' }, params: { ink: 'all', mode: 'cut', r: '$R*0.008*(0.5+rand(1))' } },
      trailG: { type: 'line', params: { x0: 0, y0: '$R*0.15', x1: 0, y1: '$R*0.15 + $r*$trail', n: 30 } },
      trailW: { type: 'wrangle', in: { geo: 'trailG' }, params: { x: '@x + sin(@v*4)*$r*0.05*@v', w: '2.2' } },
      trailH: { type: 'hand', in: { geo: 'trailW' }, params: { step: 6, wobble: 3, wave: 90, jitter: 0.4, press: 0.4, taper: 0.2, overshoot: 0 } },
      trailS: { type: 'stroke', in: { geo: 'trailH' }, params: { ink: '$ink', mode: '$mode' } },
      trailEnd: { type: 'slice', in: { geo: 'trailW' }, params: { start: 29 } },
      trailDot: { type: 'dots', in: { geo: 'trailEnd' }, params: { ink: 'all', mode: 'cut', r: 4 } },
      out: { type: 'merge', in: { list: ['trailS', 'trailDot', 'crownS', 'raysS', 'tipsD', 'flecks', 'core', 'sparkles'] } },
    },
    output: 'out',
  },
};

export const burst = LIB.burst;
