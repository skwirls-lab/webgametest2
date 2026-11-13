/* ===== The look: three passes =====
   1. colour  — flat material colours with crisp markings, banded light, halftone, rim lights
   2. g-buffer — view normal, part id, depth
   3. ink     — a line wherever the part id changes, depth breaks or the surface creases, composited over colour */
const SKIN_V = `#include <common>
#include <skinning_pars_vertex>
attribute vec2 mk; varying vec3 vN; varying vec3 vV; varying vec2 vMk; varying float vZ; varying vec3 vP; varying vec3 vNb;
void main(){ vec3 objectNormal=normal; vec3 transformed=position; vMk=mk; vP=position; vNb=normal;
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>
  vec4 mv=modelViewMatrix*vec4(transformed,1.); vN=normalize(normalMatrix*objectNormal);
  vV=projectionMatrix[3][3]==1.?vec3(0.,0.,1.):normalize(-mv.xyz); vZ=-mv.z; gl_Position=projectionMatrix*mv; }`;
const COLOR_F = `precision highp float; varying vec3 vN; varying vec3 vV; varying vec2 vMk; varying vec3 vP; varying vec3 vNb;
uniform vec3 uC0,uC1,uC2,uL,uRimA,uRimB,uRimColA,uRimColB,uShTint,uGlow,uViews,uInkCol; uniform float uCell,uLit,uRimK,uBlack,uGloss,uScale,uGrey,uPid,uInkOn;
uniform sampler2D tIF,tIS,tIB; uniform vec4 bF,bS,bB;
float inkAt(sampler2D t,vec4 b,float u,float y){ vec4 s=texture2D(t,vec2((u-b.x)*b.z,(y-b.y)*b.w)); return s.a*step(abs(s.r*255./12.-uPid),.6); }
float ht(vec2 p){ vec2 q=fract(mat2(.7071,-.7071,.7071,.7071)*p/(uCell*uScale))-.5; return length(q)*2.; }
void main(){ vec3 N=normalize(vN); if(!gl_FrontFacing)N=-N; vec3 V=normalize(vV); vec3 L=normalize(uL);
  vec3 base=uC0; base=mix(base,uC1,step(0.,vMk.x)); base=mix(base,uC2,step(0.,vMk.y));
  base=mix(base,vec3(.74,.73,.71),uGrey);
  float ndl=dot(N,L); vec3 sh=base*uShTint+vec3(.004,.006,.02);
  float d=ht(gl_FragCoord.xy); float k=clamp((.28-ndl)/.4,0.,1.);
  vec3 col=mix(base,sh,step(d,k*1.45)*uLit);
  col=mix(col,sh,step(ndl,-.12)*uLit);
  col=mix(col,vec3(.03,.03,.06),step(ndl,-.7)*uBlack);
  float fr=1.-max(dot(N,V),0.);
  col=mix(col,uRimColA,step(.46,fr*max(dot(N,normalize(uRimA)),0.))*uRimK);
  col=mix(col,uRimColB,step(.5,fr*max(dot(N,normalize(uRimB)),0.))*uRimK);
  if(uGloss>.5){ col=mix(col,vec3(1.),step(.965,dot(N,normalize(L+V)))); }
  // interior line art traced from the reference, projected from the view each surface faces (bind pose, so it sticks under animation)
  vec3 Nb=normalize(vNb); float wF=max(Nb.z,0.)*uViews.x, wS=abs(Nb.x)*uViews.y, wB=max(-Nb.z,0.)*uViews.z, ink=0.;
  if(wF>=wS&&wF>=wB){ if(wF>.45) ink=inkAt(tIF,bF,vP.x,vP.y); } else if(wS>=wB){ if(wS>.45) ink=inkAt(tIS,bS,vP.z,vP.y); } else if(wB>.45) ink=inkAt(tIB,bB,vP.x,vP.y);
  col=mix(col,uInkCol,step(.5,ink)*uInkOn);
  col+=uGlow;
  gl_FragColor=vec4(col,1.); }`;
const G_F = `precision highp float; varying vec3 vN; varying float vZ; uniform float uId,uNear,uFar;
void main(){ vec3 N=normalize(vN); if(!gl_FrontFacing)N=-N; gl_FragColor=vec4(N.xy*.5+.5,uId/40.,clamp((vZ-uNear)/(uFar-uNear),0.,1.)); }`;
const QUAD_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
const INK_F = `precision highp float; varying vec2 vUv; uniform sampler2D tC,tG; uniform vec2 uRes; uniform float uLine,uCrease,uCreaseT,uDepthT,uScale,uBoil; uniform vec3 uInk;
vec3 nrm(vec4 g){ vec2 n=g.rg*2.-1.; return vec3(n,sqrt(max(0.,1.-dot(n,n)))); }
void main(){ vec4 c=texture2D(tC,vUv); vec4 g0=texture2D(tG,vUv); float id0=floor(g0.b*40.+.5); vec3 n0=nrm(g0);
  vec2 px=vUv*uRes/uScale;
  float wob=.78+.44*sin(px.y*.043+sin(px.x*.031+uBoil)*2.+uBoil*1.7)*sin(px.x*.027+1.3+uBoil);
  float e=0.;
  for(int i=0;i<12;i++){ float a=float(i)*.5236; vec2 dir=vec2(cos(a),sin(a));
    vec4 g=texture2D(tG,vUv+dir*uLine*wob*uScale/uRes); float id=floor(g.b*40.+.5);
    float sil=(id0<.5||id<.5)?1.25:1.;
    if(sil>1.1) g=texture2D(tG,vUv+dir*uLine*wob*sil*uScale/uRes), id=floor(g.b*40.+.5);
    if(abs(id-id0)>.5) e=1.; else if(id0>.5&&abs(g.a-g0.a)>uDepthT) e=1.; }
  if(id0>.5) for(int i=0;i<6;i++){ float a=float(i)*1.0472+.3; vec2 dir=vec2(cos(a),sin(a));
    vec4 g=texture2D(tG,vUv+dir*uCrease*wob*uScale/uRes); if(abs(floor(g.b*40.+.5)-id0)<.5&&dot(nrm(g),n0)<uCreaseT) e=1.; }
  gl_FragColor=vec4(mix(c.rgb,uInk,e),1.); }`;
const LOOK = {
  uL: { value: new THREE.Vector3(.45, .62, .64) }, uRimA: { value: new THREE.Vector3(.85, .45, -.3) }, uRimB: { value: new THREE.Vector3(-.9, .12, -.3) },
  uRimColA: { value: new THREE.Color(.86, .9, 1) }, uRimColB: { value: new THREE.Color(.6, .27, 1) }, uShTint: { value: new THREE.Vector3(.56, .57, .68) },
  tIF: { value: null }, tIS: { value: null }, tIB: { value: null }, bF: { value: new THREE.Vector4() }, bS: { value: new THREE.Vector4() }, bB: { value: new THREE.Vector4() }, uInkOn: { value: 1 }, uInkCol: { value: new THREE.Color(.045, .04, .06) },
  uCell: { value: 5 }, uLit: { value: 1 }, uRimK: { value: 0 }, uBlack: { value: 0 }, uScale: { value: 1 }, uGrey: { value: 0 }, uNear: { value: 3 }, uFar: { value: 6 }
};
const INKU = { tC: { value: null }, tG: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uLine: { value: 2.1 }, uCrease: { value: 1.25 }, uCreaseT: { value: .45 }, uDepthT: { value: .012 }, uScale: LOOK.uScale, uBoil: { value: 0 }, uInk: { value: new THREE.Color(.045, .04, .06) } };
const PRESETS = {
  sheet: { L: [.45, .62, .64], lit: 1, rim: 0, black: 0, sh: [.6, .6, .68], bg: 0xb4aea6 },
  flat: { L: [.45, .62, .64], lit: 0, rim: 0, black: 0, sh: [1, 1, 1], bg: 0xb4aea6 },
  grey: { L: [.45, .62, .64], lit: 1, rim: 0, black: 0, sh: [.62, .62, .66], bg: 0xb4aea6, grey: 1 }
};
function setPreset(name) { const p = PRESETS[name]; LOOK.uL.value.set(...p.L); LOOK.uLit.value = p.lit; LOOK.uRimK.value = p.rim; LOOK.uBlack.value = p.black; LOOK.uShTint.value.set(...p.sh); LOOK.uGrey.value = p.grey ? 1 : 0; if (p.rimA) { LOOK.uRimA.value.set(...p.rimA[0]); LOOK.uRimColA.value.set(p.rimA[1]); } if (p.rimB) { LOOK.uRimB.value.set(...p.rimB[0]); LOOK.uRimColB.value.set(p.rimB[1]); } return p; }
function colorMat(c, gloss, views, pid) {
  const col = i => new THREE.Color(...(c[i] || c[0]));
  return new THREE.ShaderMaterial({ vertexShader: SKIN_V, fragmentShader: COLOR_F, side: THREE.DoubleSide, uniforms: { ...LOOK, uC0: { value: col(0) }, uC1: { value: col(1) }, uC2: { value: col(2) }, uGloss: { value: gloss ? 1 : 0 }, uGlow: { value: new THREE.Vector3() }, uViews: { value: new THREE.Vector3(...(views || [0, 0, 0])) }, uPid: { value: pid || 0 } } });
}
const gMat = id => new THREE.ShaderMaterial({ vertexShader: SKIN_V, fragmentShader: G_F, side: THREE.DoubleSide, uniforms: { uId: { value: id }, uNear: LOOK.uNear, uFar: LOOK.uFar } });
/* renders scene through the three passes into the renderer's current canvas (size w x h device pixels) */
class InkPipeline {
  constructor(R) { this.R = R; this.w = 0; this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: QUAD_V, fragmentShader: INK_F, uniforms: INKU, depthTest: false })); this.qs = new THREE.Scene(); this.qs.add(this.quad); this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); }
  size(w, h) { if (w == this.w && h == this.h) return; this.w = w; this.h = h; for (const k of ['rtC', 'rtG']) { if (this[k]) this[k].dispose(); this[k] = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }); } this.rtC.texture.minFilter = this.rtC.texture.magFilter = THREE.LinearFilter; }
  render(scene, cam, bg, scale = 1) {
    const R = this.R, b = R.getDrawingBufferSize(new THREE.Vector2()); this.size(b.x, b.y); INKU.uRes.value.copy(b); LOOK.uScale.value = scale;
    const d = cam.position.length ? cam.position.distanceTo(new THREE.Vector3(0, 1, -.2)) : 8; LOOK.uNear.value = Math.max(.05, d - 1.6); LOOK.uFar.value = d + 1.6;
    R.setRenderTarget(this.rtC); R.setClearColor(bg, 1); R.clear(); R.render(scene, cam);
    const sw = []; scene.traverse(o => { if (o.isMesh) { sw.push([o, o.material, o.visible]); if (o.userData.gMat) o.material = o.userData.gMat; else o.visible = false; } });
    R.setRenderTarget(this.rtG); R.setClearColor(0x0000ff, 1); R.clear(); R.setClearColor(new THREE.Color(.5, .5, 0), 1); R.clear(true, true, false); R.render(scene, cam);
    for (const [o, m, v] of sw) { o.material = m; o.visible = v; }
    INKU.tC.value = this.rtC.texture; INKU.tG.value = this.rtG.texture; R.setRenderTarget(null); R.render(this.qs, this.qc);
  }
}

/* rasterise the traced reference ink (REFD.ink) into one texture per view: alpha = ink, red = the part it belongs to */
function buildInkTextures() {
  const skip = (view, pid, u, y) => {            // the face features are real geometry, so their drawn versions are left out
    if (REFD.parts[pid] != 'head') return false; const a = Math.abs(u);
    if (view == 'front') return (a > .035 && a < .14 && y > 1.735 && y < 1.815) || (a < .055 && y > 1.625 && y < 1.735);
    if (view == 'side') return (u > .03 && u < .145 && y > 1.735 && y < 1.815) || (u > .14 && y < 1.735);
    return false;
  };
  for (const [view, tex, bnd] of [['front', 'tIF', 'bF'], ['side', 'tIS', 'bS'], ['back', 'tIB', 'bB']]) {
    const V = REFD.vm[view], sgn = view == 'back' ? -1 : 1, ua = -V.cx * sgn / V.s, ub = (V.w - V.cx) * sgn / V.s, u0 = Math.min(ua, ub), u1 = Math.max(ua, ub), y1 = V.gy / V.s, y0 = (V.gy - V.h) / V.s;
    const c = document.createElement('canvas'); c.width = V.w * 2; c.height = V.h * 2; const x = c.getContext('2d');
    for (const [pid, p] of REFD.ink[view]) {
      let mu = 0, my = 0; for (let i = 0; i < p.length; i += 2) { mu += p[i]; my += p[i + 1]; } mu /= p.length / 2 * 2000; my /= p.length / 2 * 2000;
      if (skip(view, pid, mu, my)) continue;
      x.fillStyle = 'rgb(' + pid * 12 + ',0,0)'; x.beginPath();
      for (let i = 0; i < p.length; i += 2) { const px = (p[i] / 2000 - u0) / (u1 - u0) * c.width, py = (y1 - p[i + 1] / 2000) / (y1 - y0) * c.height; i ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.closePath(); x.fill();
    }
    const t = new THREE.CanvasTexture(c); t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; LOOK[tex].value = t; LOOK[bnd].value.set(u0, y0, 1 / (u1 - u0), 1 / (y1 - y0));
  }
}
