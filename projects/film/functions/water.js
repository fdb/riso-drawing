// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- water: three background tints on the shared dot grid ----
LIB.water = {
  label: 'Water',
  params: { cx: Q(660, 0, 1080, 1), cy: Q(535, 0, 1080, 1), r: Q(318, 10, 600, 1), blue: Q(0.9, 0, 1.3, 0.01, 'blue density'),
    pink: Q(0.5, 0, 1.3, 0.01, 'pink haze'), yellow: Q(0.72, 0, 1.3, 0.01, 'yellow light (top left)'), mottle: Q(0.25, 0, 0.6, 0.01, 'tone mottle') },
  graph: {
    nodes: {
      disc: { type: 'circle', params: { x: '$cx', y: '$cy', r: '$r' } },
      fb: { type: 'field', params: { expr: 'clamp($blue + 0.3*radial(@x,@y,$cx+60,$cy+80,$r*1.2) - 0.4*radial(@x,@y,$cx-230,$cy-150,$r*0.85) - 0.18*radial(@x,@y,$cx+250,$cy-230,$r*0.5) - 0.12*radial(@x,@y,$cx-150,$cy+250,$r*0.5) + $mottle*(noise(@x,@y,70,1)-0.5))' } },
      tb: { type: 'tint', in: { geo: 'disc', field: 'fb' }, params: { ink: 'blue', cell: '$cellBlue', angle: '$angleBlue*PI/180' } },
      fy: { type: 'field', params: { expr: 'clamp(0.04 + $yellow*radial(@x,@y,$cx-260,$cy-140,$r) + 0.5*radial(@x,@y,$cx+260,$cy-250,$r*0.55) + 0.4*radial(@x,@y,$cx-150,$cy+290,$r*0.5) + 0.3*radial(@x,@y,$cx+280,$cy+160,$r*0.4) + $mottle*1.2*(noise(@x,@y,60,2)-0.5))' } },
      ty: { type: 'tint', in: { geo: 'disc', field: 'fy' }, params: { ink: 'yellow', cell: '$cellYellow*1.3', angle: '$angleBlue*PI/180' } },
      fp: { type: 'field', params: { expr: 'clamp($pink + 0.55*radial(@x,@y,$cx+170,$cy-150,$r*0.9) + 0.3*radial(@x,@y,$cx-40,$cy+230,$r*0.7) + 0.35*radial(@x,@y,$cx+20,$cy-120,$r*0.5) - 0.4*radial(@x,@y,$cx-240,$cy-140,$r*0.7) + $mottle*1.2*(noise(@x+150,@y+350,50,1)-0.5))' } },
      tp: { type: 'tint', in: { geo: 'disc', field: 'fp' }, params: { ink: 'pink', cell: '$cellBlue', angle: '$angleBlue*PI/180' } },
      out: { type: 'merge', in: { list: ['tb', 'ty', 'tp'] } },
    },
    output: 'out',
  },
};

export const water = LIB.water;
