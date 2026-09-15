// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- sky: three ink gradients over a rectangle (top → bottom), with mottle ----
LIB.sky = {
  label: 'Sky gradient',
  params: {
    x: Q(0, 0, 1080, 1), y: Q(0, 0, 1080, 1), w: Q(1080, 0, 1080, 1), h: Q(1080, 0, 1080, 1),
    blueTop: Q(0.9, 0, 1.3), blueBottom: Q(0.9, 0, 1.3), pinkTop: Q(0.5, 0, 1.3), pinkBottom: Q(0.5, 0, 1.3),
    yellowTop: Q(0, 0, 1.3), yellowBottom: Q(0, 0, 1.3), mottle: Q(0.2, 0, 0.6), cell: Q(5.6, 2, 16, 0.1), angle: Q(15, 0, 90, 1), seed: Q(1, 0, 99, 1),
  },
  graph: {
    let: { g: 'lin(@x,@y,0,$y,0,$y+$h)' },
    nodes: {
      box: { type: 'rect', params: { x: '$x', y: '$y', w: '$w', h: '$h' } },
      fb: { type: 'field', params: { expr: 'clamp($blueTop + ($blueBottom-$blueTop)*lin(@x,@y,0,$y,0,$y+$h) + $mottle*(noise(@x,@y,90,$seed)-0.5))' } },
      tb: { type: 'tint', in: { geo: 'box', field: 'fb' }, params: { ink: 'blue', cell: '$cell', angle: '$angle*PI/180' } },
      fp: { type: 'field', params: { expr: 'clamp($pinkTop + ($pinkBottom-$pinkTop)*lin(@x,@y,0,$y,0,$y+$h) + $mottle*(noise(@x+300,@y+100,70,$seed+1)-0.5))' } },
      tp: { type: 'tint', in: { geo: 'box', field: 'fp' }, params: { ink: 'pink', cell: '$cell', angle: '$angle*PI/180' } },
      fy: { type: 'field', params: { expr: 'clamp($yellowTop + ($yellowBottom-$yellowTop)*lin(@x,@y,0,$y,0,$y+$h) + $mottle*(noise(@x+700,@y+500,80,$seed+2)-0.5))' } },
      ty: { type: 'tint', in: { geo: 'box', field: 'fy' }, params: { ink: 'yellow', cell: '$cell*1.2', angle: '$angle*PI/180' } },
      out: { type: 'merge', in: { list: ['tb', 'ty', 'tp'] } },
    },
    output: 'out',
  },
};

export const sky = LIB.sky;
