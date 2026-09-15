// whale: scene data. Params may be numbers or expressions of t, u, iris.
export const scene = {
  name: 'whale',
  about: 'a blue whale under rays of light, echo arcs and bubbles',
  seed: 12,
  transition: null,
  graph: {
    let: { cellBlue: 7, cellPink: 7, cellYellow: 7.5, angleBlue: 15, anglePink: 45, angleYellow: 0 },
    nodes: {
      // water: pale at the surface, navy at the bottom
      water: { type: 'sky', params: { y: 0, h: 1080, blueTop: 0.36, blueBottom: 1.0, pinkTop: 0.0, pinkBottom: 0.5, mottle: 0.18, cell: 7, seed: 12 } },
      deepPts: { type: 'polygon', params: { pts: '-10 700 1090 700 1090 1090 -10 1090' } },
      deepScatter: { type: 'scatter', in: { geo: 'deepPts' }, params: { count: 260 } },
      deepDots: { type: 'dots', in: { geo: 'deepScatter' }, params: { ink: 'pink', mode: 'add', r: '(0.8+1.6*rand(1))*(rand(2) < (@y-700)/400 ? 1 : 0)' } },
      // rays of light from the surface, fading down; yellow over blue prints green
      ray1: { type: 'polygon', params: { pts: '150 -10 285 -10 400 640 300 720' } },
      ray2: { type: 'polygon', params: { pts: '30 -10 110 -10 280 600 230 650' } },
      ray3: { type: 'polygon', params: { pts: '650 -10 790 -10 470 760 380 700' } },
      ray4: { type: 'polygon', params: { pts: '870 -10 990 -10 700 540 630 500' } },
      ray5: { type: 'polygon', params: { pts: '990 -10 1090 -10 1090 200 900 400 860 380' } },
      rays: { type: 'merge', in: { list: ['ray1', 'ray2', 'ray3', 'ray4', 'ray5'] } },
      raysW: { type: 'wrangle', in: { geo: 'rays' }, params: { x: '@x + 10*sin(t*0.8 + @y*0.004) + 14*(noise(@y, @x*0.2, 120, 14)-0.5)' } },
      rayF: { type: 'field', params: { expr: 'clamp(0.85*pow(1-lin(@x,@y,0,0,0,780),1.6) + 0.5*(noise(@x,@y,22,15)-0.5) + 0.25*(noise(@x,@y,70,16)-0.5) + 0.08*sin(t*2+@y*0.02))' } },
      raysY: { type: 'tint', in: { geo: 'raysW', field: 'rayF' }, params: { ink: 'yellow', cell: 8, angle: 0.05 } },
      rayPts: { type: 'scatter', in: { geo: 'raysW' }, params: { count: 260 } },
      rayDots: { type: 'dots', in: { geo: 'rayPts' }, params: { ink: 'yellow', mode: 'solid', r: '(1.2+3*rand(1))*(rand(2) < 1.1-@y/700 ? 1 : 0)' } },
      // echo arcs from the right
      arcs: { type: 'copy', params: { n: 6 }, template: { nodes: {
        a: { type: 'ellipse', params: { x: 1095, y: 390, rx: '60+@i*50', ry: '60+@i*50', a0: '96+@i*2', a1: '264-@i*2', n: 36 } } }, output: 'a' } },
      arcsH: { type: 'hand', in: { geo: 'arcs' }, params: { step: 7, wobble: 2, wave: 90, jitter: 0.5, press: 0.6, taper: 0.7, overshoot: 0 } },
      arcsW: { type: 'wrangle', in: { geo: 'arcsH' }, params: { x: '@x + 3*sin(t*3+@v*10)', w: '@pw*9' } },
      arcsY: { type: 'stroke', in: { geo: 'arcsW' }, params: { ink: 'yellow', mode: 'solid' } },
      arcsB: { type: 'stroke', in: { geo: 'arcsW' }, params: { ink: 'blue', mode: 'add', tone: 0.2 } },
      arcsPts: { type: 'resample', in: { geo: 'arcsW' }, params: { step: 18 } },
      arcsD: { type: 'dots', in: { geo: 'arcsPts' }, params: { ink: 'blue', mode: 'add', tone: 0.9, r: '(1.5+3*rand(1))*(rand(2)<0.6)' } },
      // the whale
      whale: { type: 'whale', params: { x: 1015, y: 650, rot: -0.28, scale: 1 } },
      // bubbles
      bubbles: { type: 'copy', params: { n: 7, x: '$x0 + 5*sin(t*1.4+@i)', y: '$y0 - 12*t - 6*sin(t*1.1+@i*2)' }, template: {
        let: { x0: '900+rand(1)*170', y0: '400+rand(2)*280', r: '3+rand(3)*8' },
        nodes: { c: { type: 'circle', params: { x: 0, y: 0, r: '$r', n: 20 } } }, output: 'c' } },
      bubblesS: { type: 'stroke', in: { geo: 'bubbles' }, params: { ink: 'all', mode: 'cut', w: 1.8 } },
      bubblesP: { type: 'stroke', in: { geo: 'bubbles' }, params: { ink: 'pink', mode: 'add', w: 1, tone: 0.6 } },
      marks: { type: 'merge', in: { list: ['water', 'deepDots', 'raysY', 'rayDots', 'arcsY', 'arcsB', 'arcsD', 'whale', 'bubblesS', 'bubblesP'] } },
      stencils: { type: 'rasterize', in: { marks: 'marks' } },
      print: { type: 'risoPrint', in: { stencils: 'stencils' }, params: { blueCell: '$cellBlue', pinkCell: '$cellPink', yellowCell: '$cellYellow', blueAngle: '$angleBlue', pinkAngle: '$anglePink', yellowAngle: '$angleYellow' } },
    },
    output: 'print',
    marks: 'marks',
  },
};
