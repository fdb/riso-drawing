// saturn: scene data. Params may be numbers or expressions of t, u, iris.
// The rings are an ellipse tilted by -0.3 rad about (430, 640); the planet's bands run parallel to it.
export const scene = {
  name: 'saturn',
  about: 'Saturn in pink and orange halftone with yellow rings, deep blue space with stars',
  seed: 41,
  transition: null,
  graph: {
    let: { cellBlue: 11, cellPink: 9, cellYellow: 7, angleBlue: 15, anglePink: 45, angleYellow: 0, rcx: 430, rcy: 640, rrx: 720, rry: 320, tilt: -0.3 },
    nodes: {
      frame: { type: 'rect', params: { x: 0, y: 0, w: 1080, h: 1080 } },
      spaceB: { type: 'field', params: { expr: 'clamp(0.9 + 0.2*(noise(@x,@y,200,2)-0.5))' } },
      spaceBT: { type: 'tint', in: { geo: 'frame', field: 'spaceB' }, params: { ink: 'blue', cell: '$cellBlue', angle: '$angleBlue*PI/180' } },
      spaceP: { type: 'field', params: { expr: 'clamp(0.42 + 0.3*(noise(@x+500,@y,160,3)-0.5) + 0.03*sin(t*0.7 + @x*0.01))' } },
      spacePT: { type: 'tint', in: { geo: 'frame', field: 'spaceP' }, params: { ink: 'pink', cell: 13, angle: '$anglePink*PI/180' } },
      starPts: { type: 'scatter', in: { geo: 'frame' }, params: { count: 260 } },
      stars: { type: 'dots', in: { geo: 'starPts' }, params: { ink: 'all', mode: 'cut', r: '(0.6+1.3*rand(1))*(0.8+0.3*sin(t*2.5+rand(2)*7))' } },
      yStarPts: { type: 'scatter', in: { geo: 'frame' }, params: { count: 60 } },
      yStars: { type: 'dots', in: { geo: 'yStarPts' }, params: { ink: 'yellow', mode: 'solid', r: '0.8+1.2*rand(1)' } },
      // pink halftone halo just outside the planet's rim
      haloC: { type: 'circle', params: { x: 440, y: 600, r: 500, n: 120 } },
      haloF: { type: 'field', params: { expr: 'clamp(1 - (dist(@x,@y,440,600)-440)/55)' } },
      halo: { type: 'tint', in: { geo: 'haloC', field: 'haloF' }, params: { ink: 'pink', cell: 11, angle: '$anglePink*PI/180' } },
      // rings behind the planet: full ellipses, drawn first
      bands: { type: 'copy', params: { n: 5 }, template: { let: { s: '[0.74,0.8,0.88,0.96,1.05][@i]', bw: '[22,40,14,58,30][@i]' }, nodes: {
        e: { type: 'ellipse', params: { x: '$rcx', y: '$rcy', rx: '$rrx*$s', ry: '$rry*$s', rot: '$tilt', n: 200 } },
        ek: { type: 'attr', in: { geo: 'e' }, attrs: { bw: '$bw' } } }, output: 'ek' } },
      bandsW: { type: 'wrangle', in: { geo: 'bands' }, params: { w: '@bw*(0.75+0.5*noise(@v*4000,@bw*10,150,5))' } },
      bandsH: { type: 'hand', in: { geo: 'bandsW' }, params: { step: 7, wobble: 2.5, wave: 120, jitter: 0.5, press: 0.3, taper: 0, overshoot: 0 } },
      bandsY: { type: 'stroke', in: { geo: 'bandsH' }, params: { ink: 'yellow', mode: 'solid' } },
      streaks: { type: 'copy', params: { n: 9 }, template: { let: { s: '[0.77,0.82,0.85,0.9,0.93,0.965,1.0,1.03,1.07][@i] + (rand(1)-0.5)*0.01' }, nodes: {
        e: { type: 'ellipse', params: { x: '$rcx', y: '$rcy', rx: '$rrx*$s', ry: '$rry*$s', rot: '$tilt', n: 200 } } }, output: 'e' } },
      streaksH: { type: 'hand', in: { geo: 'streaks' }, params: { step: 7, wobble: 2, wave: 100, jitter: 0.4, press: 0.6, taper: 0, overshoot: 0 } },
      streaksW: { type: 'wrangle', in: { geo: 'streaksH' }, params: { w: '@pw*1.1*(0.5+0.5*noise(@v*3000,@i,90,9))' } },
      streaksC: { type: 'stroke', in: { geo: 'streaksW' }, params: { ink: 'all', mode: 'cut' } },
      gaps: { type: 'copy', params: { n: 3 }, template: { let: { s: '[0.845,0.92,1.01][@i]' }, nodes: {
        e: { type: 'ellipse', params: { x: '$rcx', y: '$rcy', rx: '$rrx*$s', ry: '$rry*$s', rot: '$tilt', n: 200 } } }, output: 'e' } },
      gapsH: { type: 'hand', in: { geo: 'gaps' }, params: { step: 7, wobble: 1.5, wave: 100, jitter: 0.4, press: 0.4, taper: 0, overshoot: 0 } },
      gapsB: { type: 'stroke', in: { geo: 'gapsH' }, params: { ink: 'blue', mode: 'add' } },
      // the planet: solid pink, yellow bands top and lower, blue at the bottom, all parallel to the rings
      planet: { type: 'circle', params: { x: 440, y: 600, r: 450, n: 160 } },
      planetH: { type: 'hand', in: { geo: 'planet' }, params: { step: 8, wobble: 2, wave: 150, jitter: 0.5, press: 0, taper: 0, overshoot: 0 } },
      planetP: { type: 'fill', in: { geo: 'planetH' }, params: { ink: 'pink', mode: 'solid' } },
      bandY: { type: 'field', params: { expr: 'clamp(1.1*clamp((-0.22 - ((@x-440)*0.2955+(@y-600)*0.9553)/450)*3.5) + 1.0*clamp((((@x-440)*0.2955+(@y-600)*0.9553)/450 - 0.12)*4)*clamp((0.62 - ((@x-440)*0.2955+(@y-600)*0.9553)/450)*3) + 0.2*(noise(@x,@y,60,7)-0.5))' } },
      bandYT: { type: 'tint', in: { geo: 'planetH', field: 'bandY' }, params: { ink: 'yellow', cell: '$cellYellow', angle: '$angleYellow*PI/180' } },
      bandB: { type: 'field', params: { expr: 'clamp((((@x-440)*0.2955+(@y-600)*0.9553)/450 - 0.36)*2.6 + 0.25*(noise(@x,@y,50,8)-0.5))' } },
      bandBT: { type: 'tint', in: { geo: 'planetH', field: 'bandB' }, params: { ink: 'blue', cell: '$cellBlue', angle: '$angleBlue*PI/180' } },
      grainPts: { type: 'scatter', in: { geo: 'planet' }, params: { count: 500 } },
      grainC: { type: 'dots', in: { geo: 'grainPts' }, params: { ink: 'all', mode: 'cut', r: '0.5+1.0*rand(1)' } },
      grainY: { type: 'dots', in: { geo: 'grainPts' }, params: { ink: 'yellow', mode: 'add', r: '0.8+1.4*rand(2)' } },
      // the front of the rings: the lower arcs, over the planet
      fBands: { type: 'copy', params: { n: 5 }, template: { let: { s: '[0.74,0.8,0.88,0.96,1.05][@i]', bw: '[22,40,14,58,30][@i]' }, nodes: {
        e: { type: 'ellipse', params: { x: '$rcx', y: '$rcy', rx: '$rrx*$s', ry: '$rry*$s', rot: '$tilt', a0: -5, a1: 185, n: 120 } },
        ek: { type: 'attr', in: { geo: 'e' }, attrs: { bw: '$bw' } } }, output: 'ek' } },
      fBandsW: { type: 'wrangle', in: { geo: 'fBands' }, params: { w: '@bw*(0.75+0.5*noise(@v*4000,@bw*10,150,5))' } },
      fBandsH: { type: 'hand', in: { geo: 'fBandsW' }, params: { step: 7, wobble: 2.5, wave: 120, jitter: 0.5, press: 0.3, taper: 0.2, overshoot: 0 } },
      fBandsY: { type: 'stroke', in: { geo: 'fBandsH' }, params: { ink: 'yellow', mode: 'solid' } },
      fStreaks: { type: 'copy', params: { n: 9 }, template: { let: { s: '[0.77,0.82,0.85,0.9,0.93,0.965,1.0,1.03,1.07][@i] + (rand(1)-0.5)*0.01' }, nodes: {
        e: { type: 'ellipse', params: { x: '$rcx', y: '$rcy', rx: '$rrx*$s', ry: '$rry*$s', rot: '$tilt', a0: -5, a1: 185, n: 120 } } }, output: 'e' } },
      fStreaksH: { type: 'hand', in: { geo: 'fStreaks' }, params: { step: 7, wobble: 2, wave: 100, jitter: 0.4, press: 0.6, taper: 0, overshoot: 0 } },
      fStreaksW: { type: 'wrangle', in: { geo: 'fStreaksH' }, params: { w: '@pw*1.1*(0.5+0.5*noise(@v*3000,@i,90,9))' } },
      fStreaksC: { type: 'stroke', in: { geo: 'fStreaksW' }, params: { ink: 'all', mode: 'cut' } },
      fGaps: { type: 'copy', params: { n: 3 }, template: { let: { s: '[0.845,0.92,1.01][@i]' }, nodes: {
        e: { type: 'ellipse', params: { x: '$rcx', y: '$rcy', rx: '$rrx*$s', ry: '$rry*$s', rot: '$tilt', a0: -5, a1: 185, n: 120 } } }, output: 'e' } },
      fGapsH: { type: 'hand', in: { geo: 'fGaps' }, params: { step: 7, wobble: 1.5, wave: 100, jitter: 0.4, press: 0.4, taper: 0, overshoot: 0 } },
      fGapsB: { type: 'stroke', in: { geo: 'fGapsH' }, params: { ink: 'blue', mode: 'add' } },
      marks: { type: 'merge', in: { list: ['spaceBT', 'spacePT', 'stars', 'yStars', 'halo', 'bandsY', 'streaksC', 'gapsB', 'planetP', 'bandYT', 'bandBT', 'grainC', 'grainY', 'fBandsY', 'fStreaksC', 'fGapsB'] } },
      stencils: { type: 'rasterize', in: { marks: 'marks' } },
      print: { type: 'risoPrint', in: { stencils: 'stencils' }, params: { blueCell: '$cellBlue', pinkCell: '$cellPink', yellowCell: '$cellYellow', blueAngle: '$angleBlue', pinkAngle: '$anglePink', yellowAngle: '$angleYellow' } },
    },
    output: 'print',
    marks: 'marks',
  },
};
