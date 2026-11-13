/* ===== Graphic-novel look: banded light, halftone midtones, spotted blacks, rim lights, inked hull outlines ===== */
const TOON_V = `varying vec3 vN; varying vec3 vV; varying vec3 vC;
void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal);
  vV=projectionMatrix[3][3]==1.?vec3(0.,0.,1.):normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`;
const TOON_F = `precision highp float; varying vec3 vN; varying vec3 vV; varying vec3 vC;
uniform vec3 uL,uRimA,uRimB,uRimColA,uRimColB; uniform float uGloss,uCell,uFrost;
float ht(vec2 p){ vec2 q=fract(mat2(.7071,-.7071,.7071,.7071)*p/uCell)-.5; return length(q)*2.; }
void main(){ vec3 N=normalize(vN); if(!gl_FrontFacing)N=-N; vec3 V=normalize(vV); vec3 L=normalize(uL);
  float ndl=dot(N,L); vec3 base=vC; vec3 sh=base*vec3(.40,.43,.62)+vec3(.01,.015,.05);
  float d=ht(gl_FragCoord.xy); float cov=clamp((.2-ndl)/.55,0.,1.);
  vec3 col=mix(base,sh,step(d,cov*1.5));
  col=mix(col,vec3(.035,.035,.07),step(ndl,-.66));
  float fr=1.-max(dot(N,V),0.);
  if(uFrost>.5) col=mix(col,mix(vec3(.74,.75,.82),sh*1.5,step(d,cov*1.5)),step(.58,fr));
  col=mix(col,uRimColA,step(.46,fr*max(dot(N,normalize(uRimA)),0.)));
  col=mix(col,uRimColB,step(.5,fr*max(dot(N,normalize(uRimB)),0.)));
  if(uGloss>.5){ col=mix(col,vec3(1.),step(.972,dot(N,normalize(L+V)))); col=mix(col,vec3(.55,.5,.8),step(.985,dot(N,normalize(vec3(-.5,-.35,.8))))); }
  gl_FragColor=vec4(col,1.); }`;
const HULL_V = `uniform float uW; uniform vec2 uRes; uniform vec3 uL;
void main(){ vec4 cp=projectionMatrix*modelViewMatrix*vec4(position,1.); vec3 nv=normalize(normalMatrix*normal);
  vec2 dir=normalize((projectionMatrix*vec4(nv,0.)).xy+vec2(1e-6));
  float w=uW*mix(.55,1.7,smoothstep(-.5,.7,-dot(nv,normalize(uL))))*(.82+.36*sin(position.y*41.+position.x*29.+position.z*17.));
  cp.xy+=dir*w*2./uRes*cp.w; gl_Position=cp; }`;
const HULL_F = `void main(){ gl_FragColor=vec4(.035,.03,.06,1.); }`;
const LOOK = {
  uL: { value: new THREE.Vector3(.45, .62, .64) }, uRimA: { value: new THREE.Vector3(.85, .45, -.3) }, uRimB: { value: new THREE.Vector3(-.9, .12, -.3) },
  uRimColA: { value: new THREE.Color(.86, .9, 1) }, uRimColB: { value: new THREE.Color(.6, .27, 1) }, uCell: { value: 7 }, uRes: { value: new THREE.Vector2(1, 1) }, uW: { value: 3.2 }
};
function toonMat(gloss, frost) { return new THREE.ShaderMaterial({ vertexShader: TOON_V, fragmentShader: TOON_F, vertexColors: true, side: THREE.DoubleSide, uniforms: { ...LOOK, uGloss: { value: gloss ? 1 : 0 }, uFrost: { value: frost ? 1 : 0 } } }); }
const hullMat = (w = 1) => new THREE.ShaderMaterial({ vertexShader: HULL_V, fragmentShader: HULL_F, side: THREE.BackSide, uniforms: { ...LOOK, uW: { value: 3.2 * w } } });
