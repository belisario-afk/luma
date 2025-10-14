#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform vec2  uResolution;
uniform float uEnergy, uBass, uVocal, uCentroid;
uniform vec3  uColor1, uColor2, uAlbumAvg;
uniform float uAlbumOn;

varying vec2 vUv;

// light fbm
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v=0., a=0.5;
  for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; }
  return v;
}

vec2 kaleido(vec2 p, float k){
  float a = atan(p.y,p.x), r = length(p);
  a = mod(a, 6.2831853/k);
  a = abs(a - 3.14159265/k);
  return vec2(cos(a), sin(a))*r;
}

void main(){
  vec2 uv = (gl_FragCoord.xy/uResolution.xy)*2.0-1.0;
  uv.x *= uResolution.x/uResolution.y;
  float t = uTime;

  // kaleido-warped domain
  float seg = 4.0 + floor(6.0*uCentroid);
  vec2 p = kaleido(uv, seg);
  p += 0.15*vec2(sin(0.7*t + p.y*1.2), cos(0.6*t - p.x*1.1));

  // stone-like texture
  float m = fbm(p*2.0 + vec2(0.2*sin(t*0.3), 0.2*cos(t*0.25)));
  float ridge = abs(m - 0.5);
  float carve = smoothstep(0.35, 0.0, ridge);

  // color from album palette with cool/warm mix
  vec3 pal = mix(uAlbumAvg, mix(uColor1,uColor2,0.5+0.5*sin(0.2*t)), uAlbumOn);
  vec3 base = mix(pal*0.7, pal*1.3, carve);

  // structure lift by bass/energy, micro motion by vocal
  float relief = 0.4 + 0.8*uEnergy + 0.3*uBass;
  vec3 col = base * relief + vec3(0.08*uVocal);

  col *= smoothstep(1.2, 0.25, length(uv));
  gl_FragColor = vec4(col, 1.0);
}