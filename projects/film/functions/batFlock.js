// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- flock: bats scattered inside a wired shape, drifting along a heading, inked dark ----
LIB.batFlock = {
  label: 'Flock of bats',
  inputs: ['geo'],
  params: {
    count: Q(60, 0, 400, 1), size: Q(36, 4, 300, 1, 'wingspan'), vary: Q(0.5, 0, 1, 0.01), heading: Q(-0.9, -3.2, 3.2, 0.01, 'drift direction (rad)'),
    drift: Q(20, 0, 200, 1, 'px per second'), tone: Q(1, 0, 1, 0.01), seed: Q(1, 0, 99, 1),
  },
  graph: {
    nodes: {
      area: { type: 'input', params: { name: 'geo' } },
      pts: { type: 'scatter', in: { geo: 'area' }, params: { count: '$count' } },
      bats: { type: 'copy', in: { points: 'pts' }, params: { orient: 0, x: 'cos($heading)*$drift*t', y: 'sin($heading)*$drift*t' }, template: {
        nodes: { b: { type: 'batSilhouette', params: { w: '$size*(1-$vary+2*$vary*rand(1))', rot: '(rand(2)-0.5)*0.6', flap: '1+0.35*sin(t*9+rand(3)*6)', seed: '$seed+@i' } } },
        output: 'b' } },
      fb: { type: 'fill', in: { geo: 'bats' }, params: { ink: 'blue', mode: 'add', tone: '$tone' } },
      fp: { type: 'fill', in: { geo: 'bats' }, params: { ink: 'pink', mode: 'add', tone: '$tone*0.8' } },
      fy: { type: 'fill', in: { geo: 'bats' }, params: { ink: 'yellow', mode: 'add', tone: '$tone' } },
      out: { type: 'merge', in: { list: ['fb', 'fp', 'fy'] } },
    },
    output: 'out',
  },
};

export const batFlock = LIB.batFlock;
