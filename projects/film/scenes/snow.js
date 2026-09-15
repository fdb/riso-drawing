// snow: scene data. Params may be numbers or expressions of t, u, iris.
export const scene = {
  name: 'snow',
  about: 'snowflakes drifting on a magenta night',
  seed: 7,
  transition: { type: 'cut', open: 0, hold: 0.125, close: 0, gap: 0 },
  graph: {
    let: { cellBlue: 5.6, cellPink: 5.2, cellYellow: 6.2, angleBlue: 15, anglePink: 45, angleYellow: 0 },
    nodes: {
      sky: { type: 'sky', params: { y: 0, h: 1080, blueTop: 0.85, blueBottom: 0.3, pinkTop: 0.8, pinkBottom: 1.0, yellowTop: 0, yellowBottom: 0.5, mottle: 0.35, seed: 2 } },
      bigA: { type: 'flake', params: { x: 900, y: 60, r: 280, rot: 0.5, arms: 6, branches: 2, width: 5, ink: 'pink', mode: 'solid', tone: 0.5, halo: 0, core: 0 } },
      bigB: { type: 'flake', params: { x: 120, y: 880, r: 260, rot: -0.3, arms: 6, branches: 2, width: 5, ink: 'pink', mode: 'solid', tone: 0.5, halo: 0, core: 0 } },
      bigC: { type: 'flake', params: { x: 1060, y: 620, r: 220, rot: 0.2, arms: 6, branches: 2, width: 5, ink: 'pink', mode: 'solid', tone: 0.5, halo: 0, core: 0 } },
      starPts: { type: 'scatter', params: { x: 540, y: 540, r: 800, count: 260 } },
      stars: { type: 'dots', in: { geo: 'starPts' }, params: { ink: 'all', mode: 'cut', r: '0.7+1.3*rand(1)' } },
      sparkPts: { type: 'scatter', params: { x: 540, y: 540, r: 780, count: 22 } },
      sparks: { type: 'copy', in: { points: 'sparkPts' }, params: { orient: 0, scale: '0.6+0.8*rand(2)' }, template: { nodes: {
        a: { type: 'polygon', params: { pts: '-8 0 8 0', closed: 0 } }, b: { type: 'polygon', params: { pts: '0 -8 0 8', closed: 0 } }, ab: { type: 'merge', in: { list: ['a', 'b'] } } }, output: 'ab' } },
      sparksS: { type: 'stroke', in: { geo: 'sparks' }, params: { ink: 'all', mode: 'cut', w: 1.6 } },
      main: { type: 'flake', params: { x: '590 + 4*sin(t*0.9)', y: '410 + 6*sin(t*0.7)', r: 235, rot: '-0.35 + 0.02*sin(t*0.5)', arms: 6, branches: 3, width: 1 } },
      web: { type: 'webflake', params: { x: 100, y: 180, r: 92, rot: 0.3, rings: 5, spokes: 12 } },
      small: { type: 'flake', params: { x: 990, y: 940, r: 95, rot: 0.2, arms: 6, branches: 3, width: 1.2 } },
      spool: { type: 'polygon', params: { pts: '880 560 890 555 960 640 950 645' } },
      spoolEnds: { type: 'polygon', params: { pts: '870 575 905 545 940 625 980 660', closed: 0 } },
      spoolS: { type: 'fill', in: { geo: 'spool' }, params: { ink: 'all', mode: 'cut' } },
      spoolE: { type: 'stroke', in: { geo: 'spoolEnds' }, params: { ink: 'all', mode: 'cut', w: 5 } },
      marks: { type: 'merge', in: { list: ['sky', 'bigA', 'bigB', 'bigC', 'stars', 'sparksS', 'main', 'web', 'small', 'spoolS', 'spoolE'] } },
      stencils: { type: 'rasterize', in: { marks: 'marks' } },
      print: { type: 'risoPrint', in: { stencils: 'stencils' }, params: { blueCell: '$cellBlue', pinkCell: '$cellPink', yellowCell: '$cellYellow', blueAngle: '$angleBlue', pinkAngle: '$anglePink', yellowAngle: '$angleYellow' } },
    },
    output: 'print',
    marks: 'marks',
  },
};
