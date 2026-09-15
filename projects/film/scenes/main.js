// main: scene data. Params may be numbers or expressions of t, u, iris.
export const scene = {
  name: 'main',
  about: 'the film: worlds in order',
  seed: 1,
  transition: null,
  graph: {
    let: { cellBlue: 5.6, cellPink: 5.2, cellYellow: 6.2, angleBlue: 15, anglePink: 45, angleYellow: 0 },
    nodes: {
      c1: { type: 'clip', params: { scene: 'jelly', dur: 0.5, mode: 'cut' } },
      c2: { type: 'clip', params: { scene: 'fireworks', dur: 0.25, mode: 'cut' } },
      c3: { type: 'clip', params: { scene: 'snow', dur: 0.125, mode: 'cut' } },
      c4: { type: 'clip', params: { scene: 'mountains', dur: 0.125, mode: 'cut' } },
      c5: { type: 'clip', params: { scene: 'jelly', dur: 0.5, mode: 'cut' } },
      seq: { type: 'sequence', in: { list: ['c1', 'c2', 'c3', 'c4', 'c5'] }, params: { gap: 0 } },
      stencils: { type: 'rasterize', in: { marks: 'seq' } },
      print: { type: 'risoPrint', in: { stencils: 'stencils' }, params: { blueCell: '$cellBlue', pinkCell: '$cellPink', yellowCell: '$cellYellow', blueAngle: '$angleBlue', pinkAngle: '$anglePink', yellowAngle: '$angleYellow' } },
    },
    output: 'print',
    marks: 'seq',
  },
};
