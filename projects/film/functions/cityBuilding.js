// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- building: a navy tower (blue + pink) with floor lines and a grid of windows. Each window
// draws one of: yellow, pink, orange, paper-white, blinds (paper with blue stripes) or dark.
// A few dark windows light up now and then. ----
LIB.cityBuilding = {
  label: 'Building',
  params: {
    x: Q(0, -200, 1080, 1), y: Q(200, -200, 1080, 1), w: Q(400, 20, 1200, 1), h: Q(900, 20, 1300, 1),
    cols: Q(6, 1, 30, 1), rows: Q(10, 1, 40, 1), winW: Q(50, 4, 200, 1), winH: Q(46, 4, 200, 1),
    lit: Q(0.6, 0, 1, 0.01, 'share of lit windows'), floors: Q(1, 0, 1, 1, 'floor lines'), seed: Q(1, 0, 99, 1),
  },
  graph: {
    nodes: {
      body: { type: 'rect', params: { x: '$x', y: '$y', w: '$w', h: '$h' } },
      bodyB: { type: 'fill', in: { geo: 'body' }, params: { ink: 'blue', mode: 'solid' } },
      bodyP: { type: 'fill', in: { geo: 'body' }, params: { ink: 'pink', mode: 'add' } },
      grainPts: { type: 'scatter', in: { geo: 'body' }, params: { count: '$w*$h/1400' } },
      grain: { type: 'dots', in: { geo: 'grainPts' }, params: { ink: 'pink', mode: 'cut', r: '0.6+1.2*rand(1)' } },
      floorL: { type: 'copy', params: { n: '$rows' }, template: { nodes: {
        l: { type: 'line', params: { x0: '$x', y0: '$y + $h*(@i+0.92)/$rows', x1: '$x+$w', y1: '$y + $h*(@i+0.92)/$rows', n: 2 } } }, output: 'l' } },
      floorS: { type: 'stroke', in: { geo: 'floorL' }, params: { ink: 'pink', mode: 'cut', w: 2 }, when: '$floors' },
      wins: { type: 'copy', params: { n: '$cols*$rows' }, template: {
        let: { k: 'rand(9+$seed) < $lit ? floor(rand(8+$seed)*7) : 7', wx: '$x + $w*((@i%$cols)+0.5)/$cols - $winW/2', wy: '$y + $h*(floor(@i/$cols)+0.5)/$rows - $winH/2', j: 'rand(3+$seed)*6' },
        nodes: {
          r: { type: 'rect', params: { x: '$wx', y: '$wy', w: '$winW', h: '$winH' } },
          rk: { type: 'attr', in: { geo: 'r' }, attrs: { k: '$k', ln: 0, j: '$j' } },
          blinds: { type: 'copy', params: { n: 3 }, template: { nodes: {
            l: { type: 'line', params: { x0: '$wx+2', y0: '$wy + $winH*(0.28+0.22*@i)', x1: '$wx+$winW-2', y1: '$wy + $winH*(0.28+0.22*@i)', n: 2 } } }, output: 'l' }, when: '$k == 6' },
          bk: { type: 'attr', in: { geo: 'blinds' }, attrs: { k: '$k', ln: 1, j: '$j' } },
          all: { type: 'merge', in: { list: ['rk', 'bk'] } },
        }, output: 'all' } },
      // dark windows flicker on now and then
      yel: { type: 'filter', in: { geo: 'wins' }, params: { expr: '(@k < 3 || (@k == 7 && sin(t*1.3+@j*2.1) > 0.93)) && !@ln' } },
      yelF: { type: 'fill', in: { geo: 'yel' }, params: { ink: 'yellow', mode: 'solid' } },
      yelT: { type: 'field', params: { expr: '0.35*(noise(@x,@y,30,2)-0.2)' } },
      yelG: { type: 'tint', in: { geo: 'yel', field: 'yelT' }, params: { ink: 'blue', cell: 4.5, angle: 0.4 } },
      pnk: { type: 'filter', in: { geo: 'wins' }, params: { expr: '@k == 3 && !@ln' } },
      pnkF: { type: 'fill', in: { geo: 'pnk' }, params: { ink: 'pink', mode: 'solid' } },
      org: { type: 'filter', in: { geo: 'wins' }, params: { expr: '@k == 4 && !@ln' } },
      orgY: { type: 'fill', in: { geo: 'org' }, params: { ink: 'yellow', mode: 'solid' } },
      orgP: { type: 'fill', in: { geo: 'org' }, params: { ink: 'pink', mode: 'add' } },
      wht: { type: 'filter', in: { geo: 'wins' }, params: { expr: '(@k == 5 || @k == 6) && !@ln' } },
      whtC: { type: 'fill', in: { geo: 'wht' }, params: { ink: 'all', mode: 'cut' } },
      bl: { type: 'filter', in: { geo: 'wins' }, params: { expr: '@k == 6 && @ln' } },
      blS: { type: 'stroke', in: { geo: 'bl' }, params: { ink: 'blue', mode: 'add', w: 2.5 } },
      out: { type: 'merge', in: { list: ['bodyB', 'bodyP', 'grain', 'floorS', 'yelF', 'yelG', 'pnkF', 'orgY', 'orgP', 'whtC', 'blS'] } },
    },
    output: 'out',
  },
};

export const cityBuilding = LIB.cityBuilding;
