// jelly: scene data. Params may be numbers or expressions of t, u, iris.
export const scene = {
  name: 'jelly',
  about: 'glowing pink jellyfish rising through dark water',
  seed: 5,
  transition: null,
  graph: {
    // the screens are shared by the tints in the geometry and by the print
    let: { cellBlue: 5.6, cellPink: 5.2, cellYellow: 6.2, angleBlue: 15, anglePink: 45, angleYellow: 0 },
    nodes: {
      water: { type: 'water', params: { cx: 540, cy: 540, r: 800 } },
      stars: { type: 'stars', params: { cx: 540, cy: 540, r: 800, count: 420 } },
      'small-left': { type: 'jellyfish', params: { x: 250, y: 700, r: 80, rot: -0.05, tentacles: 12, length: 2.6, bob: 5 } },
      'small-right': { type: 'jellyfish', params: { x: 930, y: 640, r: 65, rot: 0.08, tentacles: 11, length: 2.8, bob: 4 } },
      big: { type: 'jellyfish', params: { x: 600, y: '380 - 14*sin(t*TAU/3)', r: 165, tentacles: 24, length: 3.0, curl: 1.3, bob: 6 } },
      marks: { type: 'merge', in: { list: ['water', 'stars', 'small-left', 'small-right', 'big'] } },
      // compositing: paint the marks onto three stencils, then print
      stencils: { type: 'rasterize', in: { marks: 'marks' } },
      print: { type: 'risoPrint', in: { stencils: 'stencils' }, params: {
        blueCell: '$cellBlue', pinkCell: '$cellPink', yellowCell: '$cellYellow', blueAngle: '$angleBlue', pinkAngle: '$anglePink', yellowAngle: '$angleYellow' } },
    },
    output: 'print',
    marks: 'marks',
  },
};
