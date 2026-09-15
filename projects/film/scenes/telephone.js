// telephone: scene data. Params may be numbers or expressions of t, u, iris.
export const scene = {
  name: 'telephone',
  about: 'a blue rotary telephone ringing on a red table, sound rings and a sunburst behind it',
  seed: 5,
  transition: null,
  graph: {
    let: { cellBlue: 5.6, cellPink: 5.2, cellYellow: 6.2, angleBlue: 15, anglePink: 45, angleYellow: 0 },
    nodes: {
      bg: { type: 'sky', params: { y: 0, h: 1080, blueTop: 0.12, blueBottom: 0.1, pinkTop: 1.0, pinkBottom: 1.0, yellowTop: 0, yellowBottom: 0, mottle: 0.12, seed: 4 } },
      // sunburst: orange wedges (yellow over the pink) radiating from behind the phone
      rays: { type: 'copy', params: { n: 14, x: 540, y: 680, rot: '@i/@n*TAU + (rand(1)-0.5)*0.05 + 0.004*sin(t*1.3)' }, template: { nodes: {
        w: { type: 'polygon', params: { pts: '0 0 1500 -160 1500 160' } } }, output: 'w' } },
      raysF: { type: 'field', params: { expr: 'clamp(0.42 + 0.3*(noise(@x,@y,45,2)-0.5) + 0.12*radial(@x,@y,540,680,700))' } },
      raysT: { type: 'tint', in: { geo: 'rays', field: 'raysF' }, params: { ink: 'yellow', cell: '$cellYellow', angle: '$angleYellow*PI/180' } },
      // sound rings: paper arcs with a gap, pulsing
      rings: { type: 'copy', params: { n: 4 }, template: {
        let: { a0: 'rand(3)*360', cx: '540 + (rand(1)-0.5)*16', cy: '480 + (rand(2)-0.5)*16', r: '300 + @i*92 + (rand(4)-0.5)*20 + 5*sin(t*6+@i)' },
        nodes: {
          e1: { type: 'ellipse', params: { x: '$cx', y: '$cy', rx: '$r', ry: '$r', a0: '$a0', a1: '$a0 + 90 + rand(5)*50', n: 60 } },
          e2: { type: 'ellipse', params: { x: '$cx', y: '$cy', rx: '$r', ry: '$r', a0: '$a0 + 155 + rand(6)*20', a1: '$a0 + 230 + rand(7)*50', n: 60 } },
          e3: { type: 'ellipse', params: { x: '$cx', y: '$cy', rx: '$r', ry: '$r', a0: '$a0 + 300 + rand(8)*20', a1: '$a0 + 345 + rand(9)*15', n: 40 } },
          arcs: { type: 'merge', in: { list: ['e1', 'e2', 'e3'] } },
          w: { type: 'wrangle', in: { geo: 'arcs' }, params: { w: '(8 + 5*rand(10))*(0.55 + 0.6*sin(@v*PI))' } } }, output: 'w' } },
      ringsH: { type: 'hand', in: { geo: 'rings' }, params: { step: 8, wobble: 3, wave: 140, jitter: 0.6, press: 0.5, taper: 0.5, overshoot: 6 } },
      ringsS: { type: 'stroke', in: { geo: 'ringsH' }, params: { ink: 'all', mode: 'cut' } },
      // the table: red-orange, a paper edge, a dark shadow under the phone, scratches
      table: { type: 'rect', params: { x: 0, y: 925, w: 1080, h: 160 } },
      tableP: { type: 'fill', in: { geo: 'table' }, params: { ink: 'pink', mode: 'add' } },
      tableY: { type: 'fill', in: { geo: 'table' }, params: { ink: 'yellow', mode: 'add', tone: 0.8 } },
      edge: { type: 'line', params: { x0: -10, y0: 931, x1: 1090, y1: 927, n: 40 } },
      edgeW: { type: 'wrangle', in: { geo: 'edge' }, params: { w: 6 } },
      edgeH: { type: 'hand', in: { geo: 'edgeW' }, params: { step: 8, wobble: 3, wave: 180, jitter: 0.6, press: 0.5, taper: 0.3, overshoot: 0 } },
      edgeS: { type: 'stroke', in: { geo: 'edgeH' }, params: { ink: 'all', mode: 'cut' } },
      shadowG: { type: 'ellipse', params: { x: 540, y: 950, rx: 430, ry: 32 } },
      shadowF: { type: 'field', params: { expr: 'clamp(0.75*radial(@x,@y,540,950,430) + 0.3*(noise(@x,@y,30,5)-0.5))' } },
      shadow: { type: 'tint', in: { geo: 'shadowG', field: 'shadowF' }, params: { ink: 'blue', cell: '$cellBlue*1.3', angle: '$angleBlue*PI/180' } },
      scr1: { type: 'polygon', params: { pts: '640 1042 760 1012 900 1002', closed: 0 } },
      scr2: { type: 'polygon', params: { pts: '700 1054 830 1026 910 1032', closed: 0 } },
      scr3: { type: 'polygon', params: { pts: '770 1004 870 984', closed: 0 } },
      scr: { type: 'merge', in: { list: ['scr1', 'scr2', 'scr3'] } },
      scrW: { type: 'wrangle', in: { geo: 'scr' }, params: { w: 3.5 } },
      scrH: { type: 'hand', in: { geo: 'scrW' }, params: { step: 5, wobble: 2, wave: 60, jitter: 0.5, press: 0.6, taper: 0.6, overshoot: 3 } },
      scrS: { type: 'stroke', in: { geo: 'scrH' }, params: { ink: 'blue', mode: 'add' } },
      // the coiled cord, navy over the pink
      cordL: { type: 'line', params: { x0: 212, y0: 548, x1: 150, y1: 888, n: 260 } },
      cord: { type: 'wrangle', in: { geo: 'cordL' }, params: { x: '@x - 110*sin(@v*PI) + 24*cos(@v*15*TAU + 0.3*sin(t*7))', y: '@y + 9*sin(@v*15*TAU + 0.3*sin(t*7))', w: 5 } },
      cordS: { type: 'stroke', in: { geo: 'cord' }, params: { ink: 'blue', mode: 'add' } },
      // the base: a blue mound, navy halftone and hatching on its right, a paper highlight on its left
      base: { type: 'polygon', params: { pts: '194 948 198 890 210 810 236 730 284 660 350 616 440 596 540 592 640 596 728 616 794 660 842 730 868 810 880 890 876 948' } },
      baseH: { type: 'hand', in: { geo: 'base' }, params: { step: 6, wobble: 1.5, wave: 50, jitter: 0.5, press: 0, taper: 0, overshoot: 0 } },
      baseB: { type: 'fill', in: { geo: 'baseH' }, params: { ink: 'blue', mode: 'solid' } },
      baseF: { type: 'field', params: { expr: 'clamp(1.0*pow(lin(@x,@y,540,0,880,0),1.4) + 0.3*lin(@x,@y,0,700,0,950) - 0.2 + 0.25*(noise(@x,@y,50,6)-0.5))' } },
      baseShade: { type: 'tint', in: { geo: 'baseH', field: 'baseF' }, params: { ink: 'pink', cell: '$cellPink', angle: '$anglePink*PI/180' } },
      hatch: { type: 'copy', params: { n: 24 }, template: { nodes: {
        l: { type: 'line', params: { x0: '660 + @i*10 + rand(1)*8', y0: '600 + @i*5', x1: '740 + @i*10 + rand(2)*8', y1: '930 - @i*3', n: 2 } } }, output: 'l' } },
      hatchW: { type: 'wrangle', in: { geo: 'hatch' }, params: { w: '3.5 + 1.5*rand(3)' } },
      hatchH: { type: 'hand', in: { geo: 'hatchW' }, params: { step: 6, wobble: 2, wave: 70, jitter: 0.5, press: 0.5, taper: 0.5, overshoot: 0 } },
      hatchS: { type: 'stroke', in: { geo: 'hatchH' }, params: { ink: 'pink', mode: 'add' } },
      hatchC: { type: 'crop', in: { marks: 'hatchS', geo: 'baseH' } },
      hiL: { type: 'polygon', params: { pts: '214 900 222 760 254 672 310 624 400 604', closed: 0 } },
      hiW: { type: 'wrangle', in: { geo: 'hiL' }, params: { w: 4 } },
      hiH: { type: 'hand', in: { geo: 'hiW' }, params: { step: 6, wobble: 1.5, wave: 60, jitter: 0.5, press: 0.5, taper: 0.5, overshoot: 0 } },
      hiS: { type: 'stroke', in: { geo: 'hiH' }, params: { ink: 'all', mode: 'cut' } },
      // cradle hooks with paper notches
      hookL: { type: 'polygon', params: { pts: '338 606 346 556 362 542 380 556 388 556 404 542 420 556 426 606' } },
      hookR: { type: 'polygon', params: { pts: '650 606 658 556 674 542 692 556 700 556 716 542 732 556 738 606' } },
      hooks: { type: 'merge', in: { list: ['hookL', 'hookR'] } },
      hooksH: { type: 'hand', in: { geo: 'hooks' }, params: { step: 5, wobble: 1, wave: 30, jitter: 0.4, press: 0, taper: 0, overshoot: 0 } },
      hooksB: { type: 'fill', in: { geo: 'hooksH' }, params: { ink: 'blue', mode: 'solid' } },
      notchL: { type: 'rect', params: { x: 374, y: 562, w: 14, h: 16 } },
      notchR: { type: 'rect', params: { x: 686, y: 562, w: 14, h: 16 } },
      notches: { type: 'merge', in: { list: ['notchL', 'notchR'] } },
      notchesW: { type: 'fill', in: { geo: 'notches' }, params: { ink: 'all', mode: 'cut' } },
      dial: { type: 'phoneDial', params: { x: 540, y: 782, r: 150 } },
      handset: { type: 'phoneHandset', params: { x: 540, y: 420, rot: 0, bob: 4 } },
      // ringing: little blue ticks in the air around the cradle
      tickPts: { type: 'polygon', params: { pts: '236 590 284 566 796 512 846 498 896 500', closed: 0 } },
      ticks: { type: 'copy', in: { points: 'tickPts' }, params: { orient: 0, y: '3*sin(t*9+@i*2)' }, template: { nodes: {
        l: { type: 'line', params: { x0: 0, y0: '-6-8*rand(1)', x1: 0, y1: '6+8*rand(2)', n: 2 } } }, output: 'l' } },
      ticksS: { type: 'stroke', in: { geo: 'ticks' }, params: { ink: 'blue', mode: 'add', w: 5 } },
      marks: { type: 'merge', in: { list: ['bg', 'raysT', 'ringsS', 'tableP', 'tableY', 'edgeS', 'shadow', 'scrS', 'cordS', 'baseB', 'baseShade', 'hatchC', 'hiS', 'hooksB', 'notchesW', 'dial', 'handset', 'ticksS'] } },
      stencils: { type: 'rasterize', in: { marks: 'marks' } },
      print: { type: 'risoPrint', in: { stencils: 'stencils' }, params: { blueCell: '$cellBlue', pinkCell: '$cellPink', yellowCell: '$cellYellow', blueAngle: '$angleBlue', pinkAngle: '$anglePink', yellowAngle: '$angleYellow' } },
    },
    output: 'print',
    marks: 'marks',
  },
};
