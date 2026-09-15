// function made of blocks: pure data. Q(def, min, max, step, label) builds a parameter schema.
const Q = (def, min, max, step = 0.01, label) => ({ def, min, max, step, label });
const LIB = {};

// ---- waves: a sea band with a scalloped crest, foam lines in rows, and paper speckle. Crests roll with time ----
LIB.bellWaves = {
  label: 'Sea with foam',
  params: {
    x0: Q(-20, -200, 1080, 1), x1: Q(1100, 0, 1300, 1), y: Q(800, 0, 1080, 1, 'crest line'), bottom: Q(1100, 0, 1200, 1),
    bumps: Q(9, 1, 40, 1), amp: Q(40, 0, 200, 1, 'crest height'), rows: Q(4, 0, 12, 1, 'foam rows'),
    blue: Q(1, 0, 1, 0.01), pink: Q(0.8, 0, 1, 0.01), foam: Q(3, 0, 12, 0.1, 'foam line width (0 = none)'), speckle: Q(0, 0, 4000, 1, 'paper specks'),
    speed: Q(0.6, 0, 5, 0.01, 'roll (rad/s)'), seed: Q(1, 0, 99, 1),
  },
  graph: {
    nodes: {
      base: { type: 'line', params: { x0: '$x0', y0: '$y', x1: '$x1', y1: '$y', n: 240 } },
      crest: { type: 'wrangle', in: { geo: 'base' }, params: { y: '@y - abs(sin(@v*$bumps*PI + t*$speed + noise(@x,0,300,$seed)*3))*$amp*(0.6+0.5*noise(@x,50,240,$seed+1))' } },
      foot: { type: 'polygon', params: { pts: '$x1 $bottom $x0 $bottom', closed: 0 } },
      sea: { type: 'join', in: { list: ['crest', 'foot'] }, params: { close: 1 } },
      cutY: { type: 'fill', in: { geo: 'sea' }, params: { ink: 'yellow', mode: 'cut' } },
      fb: { type: 'fill', in: { geo: 'sea' }, params: { ink: 'blue', mode: 'add', tone: '$blue' } },
      fp: { type: 'fill', in: { geo: 'sea' }, params: { ink: 'pink', mode: 'add', tone: '$pink' } },
      specks: { type: 'scatter', in: { geo: 'sea' }, params: { count: '$speckle' } },
      speckD: { type: 'dots', in: { geo: 'specks' }, params: { ink: 'all', mode: 'cut', r: '0.8+1.6*rand(1)' } },
      crestW: { type: 'wrangle', in: { geo: 'crest' }, params: { w: '$foam' } },
      crestH: { type: 'hand', in: { geo: 'crestW' }, params: { step: 6, wobble: 1.5, wave: 60, jitter: 0.5, press: 0.5, taper: 0, overshoot: 0 } },
      crestS: { type: 'stroke', in: { geo: 'crestH' }, params: { ink: 'all', mode: 'cut', w: '$foam' }, when: '$foam > 0' },
      foamRows: { type: 'copy', params: { n: '$rows' }, template: {
        let: { yy: '$y + (@i+1)*($bottom-$y)/($rows+1)' },
        nodes: {
          l: { type: 'line', params: { x0: '$x0', y0: '$yy', x1: '$x1', y1: '$yy', n: 240 } },
          w: { type: 'wrangle', in: { geo: 'l' }, params: { y: '@y - abs(sin(@v*$bumps*PI + t*$speed + @i*1.3 + noise(@x,@i*40,300,$seed)*3))*$amp*0.5', w: '$foam*0.6*(noise(@x,@i*77,90,$seed+2) > 0.5 ? 1 : 0.15)' } },
        }, output: 'w' } },
      foamH: { type: 'hand', in: { geo: 'foamRows' }, params: { step: 6, wobble: 1.2, wave: 50, jitter: 0.4, press: 0.4, taper: 0, overshoot: 0 } },
      foamS: { type: 'stroke', in: { geo: 'foamH' }, params: { ink: 'all', mode: 'cut' }, when: '$foam > 0' },
      out: { type: 'merge', in: { list: ['cutY', 'fb', 'fp', 'speckD', 'crestS', 'foamS'] } },
    },
    output: 'out',
  },
};
LIB.bellWaves.graph.nodes.foot.params.pts = '$x1 $bottom $x0 $bottom';

export const bellWaves = LIB.bellWaves;
