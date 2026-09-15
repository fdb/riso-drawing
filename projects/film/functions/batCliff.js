// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- batCliff: the canyon cliff of the bats world. A terraced crest closed to the left edge, navy with noise-broken orange slabs, a lit band on the lower face, pink streaks and rim ----
LIB.batCliff = {
  label: 'Canyon cliff',
  params: {},
  graph: {
    nodes: {
      plateau: { type: 'polygon', params: { pts: '-20 330 40 300 45 280 110 285 120 262 190 270 200 250 260 275 280 256 340 270 350 250 400 280 430 300', closed: 0 } },
      face: { type: 'polygon', params: { pts: '430 300 475 335 462 372 522 398 540 455 528 498 592 540 600 605 645 640 632 700 684 758 690 830 726 900 714 962 748 1100', closed: 0 } },
      crest: { type: 'join', in: { list: ['plateau', 'face'] } },
      ridgeH: { type: 'hand', in: { geo: 'crest' }, params: { step: 5, wobble: 4, wave: 45, jitter: 1, press: 0.5, taper: 0, overshoot: 0 } },
      cliffFoot: { type: 'polygon', params: { pts: '-20 1100', closed: 0 } },
      cliff: { type: 'join', in: { list: ['ridgeH', 'cliffFoot'] }, params: { close: 1 } },
      cliffCut: { type: 'fill', in: { geo: 'cliff' }, params: { ink: 'all', mode: 'cut' } },
      fCliffB: { type: 'field', params: { expr: 'clamp(1.0 - 0.85*max(abs((@y - 0.27*@x + 50*(noise(@x,@y,120,21)-0.5))-520)<30 ? 1 : 0, max(abs((@y - 0.27*@x + 50*(noise(@x,@y,120,21)-0.5))-700)<55 ? 1 : 0, abs((@y - 0.27*@x + 50*(noise(@x,@y,120,21)-0.5))-900)<40 ? 1 : 0))*(noise(@x+40,@y,220,28) > 0.42 ? 1 : 0) + 0.2*(noise(@x,@y,35,22)-0.5))' } },
      cliffB: { type: 'tint', in: { geo: 'cliff', field: 'fCliffB' }, params: { ink: 'blue', cell: 7, angle: 0.26 } },
      fCliffP: { type: 'field', params: { expr: 'clamp(0.85 + 0.2*(noise(@x,@y,50,23)-0.5))' } },
      cliffP: { type: 'tint', in: { geo: 'cliff', field: 'fCliffP' }, params: { ink: 'pink', cell: 7, angle: 0.79 } },
      fCliffY: { type: 'field', params: { expr: 'clamp(0.05 + 0.9*max(abs((@y - 0.27*@x + 50*(noise(@x,@y,120,21)-0.5))-520)<30 ? 1 : 0, max(abs((@y - 0.27*@x + 50*(noise(@x,@y,120,21)-0.5))-700)<55 ? 1 : 0, abs((@y - 0.27*@x + 50*(noise(@x,@y,120,21)-0.5))-900)<40 ? 1 : 0))*(noise(@x+40,@y,220,28) > 0.42 ? 1 : 0) + 0.2*(noise(@x+50,@y,45,24)-0.5))' } },
      cliffY: { type: 'tint', in: { geo: 'cliff', field: 'fCliffY' }, params: { ink: 'yellow', cell: 8, angle: 0 } },
      // a lit orange band just inside the steep face
      faceLow: { type: 'polygon', params: { pts: '600 605 645 640 632 700 684 758 690 830 726 900 714 962 748 1100', closed: 0 } },
      faceIn: { type: 'polygon', params: { pts: '698 1100 664 962 676 900 640 830 634 758 582 700 595 640 550 605', closed: 0 } },
      lit: { type: 'join', in: { list: ['faceLow', 'faceIn'] }, params: { close: 1 } },
      litH: { type: 'hand', in: { geo: 'lit' }, params: { step: 6, wobble: 3, wave: 40, jitter: 0.8, press: 0, taper: 0, overshoot: 0 } },
      litCut: { type: 'fill', in: { geo: 'litH' }, params: { ink: 'blue', mode: 'cut' } },
      fLitFace: { type: 'field', params: { expr: 'clamp(0.9 + 0.2*(noise(@x,@y,40,27)-0.5))' } },
      litP: { type: 'tint', in: { geo: 'litH', field: 'fLitFace' }, params: { ink: 'pink', cell: 7, angle: 0.79 } },
      litY: { type: 'tint', in: { geo: 'litH', field: 'fLitFace' }, params: { ink: 'yellow', cell: 8, angle: 0 } },
      // pink streaks along band edges, cropped to the cliff
      streaks: { type: 'copy', params: { n: 4 }, template: { nodes: { l: { type: 'line', params: { x0: '-20 + 120*rand(1)', y0: '440 + @i*170 + 0.27*(-20 + 120*rand(1)) + (rand(3)-0.5)*30', x1: '600 - 250*rand(2)', y1: '440 + @i*170 + 0.27*(600 - 250*rand(2)) + (rand(3)-0.5)*30', n: 20 } } }, output: 'l' } },
      streaksH: { type: 'hand', in: { geo: 'streaks' }, params: { step: 6, wobble: 3, wave: 60, jitter: 0.6, press: 0.5, taper: 0.4, overshoot: 0 } },
      streaksS: { type: 'stroke', in: { geo: 'streaksH' }, params: { ink: 'pink', mode: 'solid', w: 3 } },
      streaksC: { type: 'crop', in: { marks: 'streaksS', geo: 'cliff' } },
      rim: { type: 'stroke', in: { geo: 'ridgeH' }, params: { ink: 'pink', mode: 'solid', w: 3 } },
      out: { type: 'merge', in: { list: ['cliffCut', 'cliffB', 'cliffP', 'cliffY', 'litCut', 'litP', 'litY', 'streaksC', 'rim'] } },
    },
    output: 'out',
  },
};

export const batCliff = LIB.batCliff;
