// Scenes are graphs of catalog nodes and library subnets. Every param may be an expression of
// t (seconds since start), u (seconds since this cycle's iris opened) and iris (mask scale 0..1).

export const SCENES = {
  jelly: {
    name: 'jelly',
    about: 'glowing pink jellyfish rising through dark water',
    seed: 5,
    transition: { type: 'iris', open: 0.17, hold: 0.5, close: 0.17, gap: 0.3 },
    graph: {
      // the screens are shared by the tints in the geometry and by the print
      let: { cellBlue: 5.6, cellPink: 5.2, cellYellow: 6.2, angleBlue: 15, anglePink: 45, angleYellow: 0 },
      nodes: {
        disc: { type: 'circle', params: { x: 660, y: 535, r: 313 } },
        water: { type: 'water', params: {} },
        stars: { type: 'stars', params: { count: 260 } },
        'small-left': { type: 'jellyfish', params: { x: 420, y: 660, r: 64, rot: -0.05, tentacles: 12, length: 2.6, bob: 5 } },
        'small-right': { type: 'jellyfish', params: { x: 905, y: 600, r: 52, rot: 0.08, tentacles: 11, length: 2.8, bob: 4 } },
        big: { type: 'jellyfish', params: { x: 674, y: '358 - 10*u', r: 140, tentacles: 24, length: 3.0, curl: 1.3, bob: 6 } },
        bubble: { type: 'bubble', params: { x: 540, y: 542, r: 21 } },
        world: { type: 'merge', in: { list: ['water', 'stars', 'small-left', 'small-right', 'big', 'bubble'] } },
        worldClip: { type: 'clip', in: { marks: 'world', geo: 'disc' } },
        // iris: a mask circle scaled about the pivot (540, 542); the world underneath never moves
        irisC: { type: 'circle', params: { x: '540 + iris*120', y: '542 - iris*7', r: 'max(0, iris*318 - 5)', n: 90 } },
        irisMask: { type: 'mask', in: { geo: 'irisC' } },
        ringC: { type: 'circle', params: { x: '540 + iris*120', y: '542 - iris*7', r: 'iris*318 - 2', n: 180 }, when: 'iris > 0.06' },
        ring: { type: 'wrangle', in: { geo: 'ringC' }, params: {
          x: '@x + cos(@a)*(1.6*sin(@a*5+1) + 1.2*sin(@a*11+4) + (rand(@i)-0.5)*1.4)',
          y: '@y + sin(@a)*(1.6*sin(@a*5+1) + 1.2*sin(@a*11+4) + (rand(@i)-0.5)*1.4)' } },
        ringB: { type: 'stroke', in: { geo: 'ring' }, params: { ink: 'blue', w: 7 } },
        ringY: { type: 'stroke', in: { geo: 'ring' }, params: { ink: 'yellow', w: 3, tone: 0.5 } },
        marks: { type: 'merge', in: { list: ['worldClip', 'irisMask', 'ringB', 'ringY'] } },
        // compositing: paint the marks onto three stencils, then print
        stencils: { type: 'rasterize', in: { marks: 'marks' } },
        print: { type: 'risoPrint', in: { stencils: 'stencils' }, params: {
          blueCell: '$cellBlue', pinkCell: '$cellPink', yellowCell: '$cellYellow', blueAngle: '$angleBlue', pinkAngle: '$anglePink', yellowAngle: '$angleYellow' } },
      },
      output: 'print',
    },
  },
};

