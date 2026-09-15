// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- lighthouse: striped tower, origin at the base centre, 630 tall to the gallery, lantern and dome above ----
LIB.lighthouse = {
  label: 'Lighthouse',
  params: { x: Q(520, 0, 1080, 1), y: Q(930, 0, 1080, 1), scale: Q(1, 0.1, 4, 0.01), bands: Q(5, 2, 12, 1), flicker: Q(1, 0, 1, 0.01) },
  xf: { x: '$x', y: '$y', scale: '$scale' },
  graph: {
    let: { H: 630, bh: '630/$bands' },
    nodes: {
      tower: { type: 'polygon', params: { pts: '-108 0 108 0 64 -630 -64 -630' } },
      towerH: { type: 'hand', in: { geo: 'tower' }, params: { step: 8, wobble: 1.5, wave: 200, jitter: 0.5, press: 0, taper: 0, overshoot: 0 } },
      towerC: { type: 'fill', in: { geo: 'towerH' }, params: { ink: 'all', mode: 'cut' } },
      pinkBands: { type: 'copy', params: { n: 'floor(($bands+1)/2)' }, template: {
        let: { y0: '-2*@i*$bh', y1: '-(2*@i+1)*$bh', w0: '108 - 44*(2*@i*$bh/630)', w1: '108 - 44*((2*@i+1)*$bh/630)' },
        nodes: { p: { type: 'polygon', params: { pts: '-$w0 $y0+9 $w0 $y0-9 $w1 $y1-9 -$w1 $y1+9' } } }, output: 'p' } },
      pinkH: { type: 'hand', in: { geo: 'pinkBands' }, params: { step: 8, wobble: 2, wave: 120, jitter: 0.8, press: 0, taper: 0, overshoot: 0 } },
      pinkC: { type: 'crop', in: { marks: 'pinkF', geo: 'towerH' } },
      pinkF: { type: 'fill', in: { geo: 'pinkH' }, params: { ink: 'pink', mode: 'solid' } },
      shade: { type: 'field', params: { expr: 'clamp(0.75*pow(lin(@x,@y,-40,0,120,0), 1.5) + 0.08*(noise(@x,@y,40,3)-0.5))' } },
      shadeB: { type: 'tint', in: { geo: 'towerH', field: 'shade' }, params: { ink: 'blue', cell: 5.6, angle: 0.26 } },
      // windows and the door
      win1: { type: 'polygon', params: { pts: '6 -520 18 -520 18 -490 6 -490' } },
      win2: { type: 'polygon', params: { pts: '10 -300 22 -300 22 -270 10 -270' } },
      win3: { type: 'polygon', params: { pts: '-30 -410 -18 -410 -18 -390 -30 -390' } },
      door: { type: 'polygon', params: { pts: '-24 -20 -24 -70 -12 -84 4 -84 16 -70 16 -20' } },
      wins: { type: 'merge', in: { list: ['win1', 'win2', 'win3', 'door'] } },
      winsB: { type: 'fill', in: { geo: 'wins' }, params: { ink: 'blue', mode: 'solid' } },
      winsP: { type: 'fill', in: { geo: 'wins' }, params: { ink: 'pink', mode: 'add', tone: 0.9 } },
      // gallery, lantern, dome
      gallery: { type: 'polygon', params: { pts: '-100 -630 100 -630 104 -664 -104 -664' } },
      rail: { type: 'polygon', params: { pts: '-90 -664 -90 -690 90 -690 90 -664', closed: 0 } },
      lanternBox: { type: 'polygon', params: { pts: '-60 -690 60 -690 60 -800 -60 -800' } },
      lanternY: { type: 'fill', in: { geo: 'lanternBox' }, params: { ink: 'yellow', mode: 'solid', tone: '1 - 0.08*$flicker*abs(sin(t*7))' } },
      mullions: { type: 'copy', params: { n: 4 }, template: { nodes: { l: { type: 'line', params: { x0: '-45 + @i*30', y0: -690, x1: '-45 + @i*30', y1: -800, n: 2 } } }, output: 'l' } },
      mullionsS: { type: 'stroke', in: { geo: 'mullions' }, params: { ink: 'blue', mode: 'add', w: 5 } },
      mullionsP: { type: 'stroke', in: { geo: 'mullions' }, params: { ink: 'pink', mode: 'add', w: 5 } },
      frame: { type: 'stroke', in: { geo: 'lanternBox' }, params: { ink: 'blue', mode: 'add', w: 6 } },
      frameP: { type: 'stroke', in: { geo: 'lanternBox' }, params: { ink: 'pink', mode: 'add', w: 6 } },
      bulb: { type: 'ellipse', params: { x: 0, y: -745, rx: 14, ry: 22, n: 30 } },
      bulbC: { type: 'fill', in: { geo: 'bulb' }, params: { ink: 'all', mode: 'cut' } },
      dome: { type: 'ellipse', params: { x: 0, y: -800, rx: 66, ry: 58, a0: 180, a1: 360, n: 40 } },
      domeBase: { type: 'polygon', params: { pts: '66 -800 -66 -800', closed: 0 } },
      domeShape: { type: 'join', in: { list: ['dome', 'domeBase'] }, params: { close: 1 } },
      knob: { type: 'polygon', params: { pts: '-5 -856 5 -856 5 -876 -5 -876' } },
      knobBall: { type: 'circle', params: { x: 0, y: -882, r: 9, n: 24 } },
      darks: { type: 'merge', in: { list: ['gallery', 'domeShape', 'knob', 'knobBall'] } },
      darksB: { type: 'fill', in: { geo: 'darks' }, params: { ink: 'blue', mode: 'solid' } },
      darksP: { type: 'fill', in: { geo: 'darks' }, params: { ink: 'pink', mode: 'add', tone: 0.9 } },
      railS: { type: 'stroke', in: { geo: 'rail' }, params: { ink: 'blue', mode: 'solid', w: 3 } },
      railP: { type: 'stroke', in: { geo: 'rail' }, params: { ink: 'pink', mode: 'add', w: 3 } },
      domeHi: { type: 'ellipse', params: { x: -18, y: -812, rx: 22, ry: 14, rot: -0.5, n: 24 } },
      domeHiS: { type: 'stroke', in: { geo: 'domeHi' }, params: { ink: 'pink', mode: 'cut', w: 3 } },
      out: { type: 'merge', in: { list: ['towerC', 'pinkC', 'shadeB', 'winsB', 'winsP', 'darksB', 'darksP', 'railS', 'railP', 'lanternY', 'mullionsS', 'mullionsP', 'frame', 'frameP', 'bulbC', 'domeHiS'] } },
    },
    output: 'out',
  },
};

export const lighthouse = LIB.lighthouse;
