import * as THREE from 'three';

// On the scalp, azimuth zero faces the forehead and polar zero is the crown.
function point(azimuth: number, polar: number, lift: number) {
  const sin = Math.sin(polar), cos = Math.cos(polar);
  return new THREE.Vector3(
    (.323 + lift) * sin * Math.sin(azimuth) - .019 * Math.max(0, cos) ** 3,
    (.365 + lift) * cos + .007,
    -(.278 + lift) * sin * Math.cos(azimuth) + .013 * Math.max(0, cos) ** 3,
  );
}

interface Lock {
  startAngle: number; endAngle: number; startPolar: number; endPolar: number;
  width: number; volume: number; bend: number; shade: number;
  flick?: number;
}

function hairEdge(a: number) {
  return .055 + .150 * Math.cos(a) + .011 * Math.sin(3*a+.3)
    + .009 * Math.sin(7*a+.8) + .004 * Math.sin(17*a-.3);
}

// The longest flyaways sit over one brow. The rest settle into the hairline.
const forelocks: Lock[] = [
  {startAngle:-1.65,endAngle:-.85,startPolar:.49,endPolar:1.16,width:.045,volume:.018,bend:-.09,shade:.51},
  {startAngle:-1.28,endAngle:-.66,startPolar:.44,endPolar:1.03,width:.055,volume:.024,bend:.11,shade:.54},
  {startAngle:-.87,endAngle:-.40,startPolar:.73,endPolar:1.20,width:.018,volume:.012,bend:.13,shade:.58},
  {startAngle:-1.03,endAngle:-.22,startPolar:.36,endPolar:.98,width:.050,volume:.025,bend:.17,shade:.58},
  {startAngle:-.82,endAngle:-.04,startPolar:.48,endPolar:1.045,width:.049,volume:.016,bend:.04,shade:.49},
  {startAngle:-.49,endAngle:.13,startPolar:.73,endPolar:1.16,width:.018,volume:.014,bend:.14,shade:.57,flick:.006},
  {startAngle:-.39,endAngle:.45,startPolar:.41,endPolar:.94,width:.054,volume:.023,bend:.10,shade:.60},
  {startAngle:.06,endAngle:.51,startPolar:.67,endPolar:1.11,width:.030,volume:.014,bend:-.09,shade:.52},
  {startAngle:.23,endAngle:.82,startPolar:.67,endPolar:1.19,width:.048,volume:.017,bend:.16,shade:.56},
  {startAngle:.67,endAngle:1.18,startPolar:.75,endPolar:1.32,width:.045,volume:.016,bend:.07,shade:.46},
];

function makeHairGeometry() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [], uvs: number[] = [];
  const umber = new THREE.Color('#322822'), honey = new THREE.Color('#8f715a');
  const color = new THREE.Color();
  const vertex = (p: THREE.Vector3, shade: number) => {
    positions.push(p.x, p.y, p.z);
    color.copy(umber).lerp(honey, THREE.MathUtils.clamp(shade, .035, .98)).toArray(colors, colors.length);
  };

  // The undercoat ends above the loose tips. A little skin can show between
  // locks over the forehead, ears and nape without holes through the crown.
  const columns = 120, rows = 26;
  vertex(point(0,0,0), .51);
  uvs.push(.5, 1);
  for (let i=1; i<=rows+1; i++) {
    const t = Math.min(i/rows,1);
    for (let j=0; j<=columns; j++) {
      const a = j * Math.PI * 2 / columns - Math.PI;
      const edge = hairEdge(a);
      const phi = t * Math.acos((edge-.007)/.365);
      const flow = a + .55*(1-t)**2 + .15*Math.sin(a+t*4);
      const strands = .5*Math.sin(flow*18 + .7*Math.sin(5*a)) + .3*Math.sin(flow*31+.4);
      const rim = i > rows;
      vertex(point(a,phi,rim ? -.012 : .005 * strands), rim ? .20 : .33 + .16*(1-t) + .12 * strands);
      uvs.push(j/columns + .115*(1-t)**2 + .035*Math.sin(2*a+t*4),1-phi/2.1);
      if (j===columns) continue;
      const ring = 1+(i-1)*(columns+1), next = j+1;
      if (i===1) indices.push(0,ring+next,ring+j);
      else {
        const prior = ring-columns-1;
        indices.push(prior+j,prior+next,ring+j, prior+next,ring+next,ring+j);
      }
    }
  }

  // A lock has a broad lifted root, a softly ridged cross section and a tip
  // that turns independently of the scalp. The varied ridges pick up real light.
  function lock(l: Lock) {
    const first = positions.length/3, steps=12, sides=10;
    function center(t: number) {
      const a = THREE.MathUtils.lerp(l.startAngle,l.endAngle,t) + l.bend*Math.sin(t*Math.PI);
      const phi = THREE.MathUtils.lerp(l.startPolar,l.endPolar,t);
      const height = -.008*(1-t) + l.volume*.56*Math.sin(Math.PI*t) + (l.flick ?? .001)*t*t;
      return point(a,phi,height);
    }
    for (let i=0;i<=steps;i++) {
      const t=i/steps, p=center(t);
      const tangent = center(Math.min(1,t+.008)).sub(center(Math.max(0,t-.008))).normalize();
      const outward = new THREE.Vector3(p.x/.323**2,(p.y-.007)/.365**2,p.z/.278**2).normalize();
      const across = new THREE.Vector3().crossVectors(tangent,outward).normalize();
      const up = new THREE.Vector3().crossVectors(across,tangent).normalize();
      const span = Math.max(.012, Math.sin(Math.PI*t**.72)**.64 * (1-.26*t));
      for (let k=0;k<sides;k++) {
        const angle=k*Math.PI*2/sides, u=Math.cos(angle), v=Math.sin(angle);
        const ridge = v>0 ? (.75 + .23*Math.cos(9*u + t*1.5)) : .43;
        const q = p.clone().addScaledVector(across, l.width*u*span)
          .addScaledVector(up, l.volume*.49*v*ridge*span);
        // A few broad lighter fibres run down the curved crest of each lock.
        const sheen = Math.max(0,v) * (.06+.06*Math.cos(u*12 + t*1.7));
        vertex(q, l.shade - .12*(1-t)**2 - .08*Math.abs(u) + sheen + .03*Math.sin(t*5));
        uvs.push(.5+l.endAngle/(2*Math.PI) + u*l.width*.69 + .011*Math.sin(t*3+l.startAngle),
          1-THREE.MathUtils.lerp(l.startPolar,l.endPolar,t)/2.1);
        if (i<steps) {
          const j=first+i*sides+k, next=first+i*sides+(k+1)%sides;
          indices.push(j,j+sides,next, next,j+sides,next+sides);
        }
      }
    }
  }

  // Stagger two layers over the sides and back. They grow around the crown
  // and drop towards the neck, crossing at the change in direction behind each ear.
  const wrap = [ .84,1.09,1.39,1.69,1.95,2.22,2.48,2.79,3.07,3.38,3.68,3.97,4.23,4.55,4.84,5.10,5.37 ];
  wrap.forEach((a,i)=>{
    const s=Math.sin(i*2.17), c=Math.cos(i*1.61);
    const fringe=hairEdge(a)-.014-.013*s;
    const lowerPolar=Math.acos((fringe-.007)/.365);
    lock({startAngle:a-.37+.11*c,endAngle:a,startPolar:lowerPolar-.43-.09*s,endPolar:lowerPolar,
      width:.053+.009*c,volume:.013+.003*s,bend:.09*s,shade:.37+.11*(.5+.5*c),flick:.003+.003*s});
    lock({startAngle:a-.85+.23*s,endAngle:a-.14,startPolar:.50+.14*c,endPolar:lowerPolar*(.68+.06*c),
      width:.061+.009*s,volume:.018+.004*c,bend:.13*c,shade:.43+.13*(.5+.5*s)});
  });

  lock({startAngle:2.0,endAngle:.62,startPolar:.12,endPolar:.43,width:.052,volume:.020,bend:.11,shade:.57});
  lock({startAngle:-2.13,endAngle:-.93,startPolar:.14,endPolar:.55,width:.055,volume:.020,bend:-.14,shade:.54});
  forelocks.forEach(lock);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const hairGeometry = makeHairGeometry();
let hairMaterial: THREE.MeshPhongMaterial | undefined;

// Each stroke is a shallow arc following the direction of growth. Wrapping the
// strokes across the seam keeps the rear view continuous as the runner turns.
function hairFibres() {
  const canvas = document.createElement('canvas');
  canvas.width=1024; canvas.height=448;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#e8dfd6'; ctx.fillRect(0,0,canvas.width,canvas.height);
  let seed=22831;
  const random=()=>{ seed=(Math.imul(1664525,seed)+1013904223)>>>0; return seed/4294967296; };
  ctx.lineCap='round';
  for (let i=0;i<3800;i++) {
    const x=random()*1024, y=random()*640-150, length=28+112*random();
    const wave=(random()-.38)*14, tilt=(random()-.50)*8;
    const broad=i<440;
    ctx.strokeStyle=random()<.32
      ? 'rgba(255,247,226,'+(.21+.30*random())+')'
      : 'rgba(68,49,40,'+((broad?.065:.13)+.18*random())+')';
    ctx.lineWidth=broad?2.6+random()*3:.55+random()*1.1;
    for (const origin of [x-1024,x,x+1024]) {
      ctx.beginPath(); ctx.moveTo(origin,y);
      ctx.bezierCurveTo(origin+wave+tilt,y+length*.32,origin+wave,y+length*.70,origin+tilt,y+length);
      ctx.stroke();
    }
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace; texture.wrapS=THREE.RepeatWrapping;
  texture.anisotropy=4;
  return texture;
}

export function addPeterHair(head: THREE.Group) {
  hairMaterial ??= new THREE.MeshPhongMaterial({
    map:hairFibres(),vertexColors:true,specular:'#241f1a',shininess:12,
  });
  const hair = new THREE.Mesh(hairGeometry,hairMaterial);
  hair.name='peter-tousled-hair';
  hair.castShadow=hair.receiveShadow=true;
  head.add(hair);
}
