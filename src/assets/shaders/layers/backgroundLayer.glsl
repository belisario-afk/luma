#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform vec2  uResolution;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uAlbumAvg;
uniform float uEnergy;
uniform float uCentroid;
uniform float uAlbumOn;

varying vec2 vUv;

// Simple fbm
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.1; a*=0.5; }
  return v;
}

void main(){
  vec2 uv = (gl_FragCoord.xy/uResolution.xy)*2.0-1.0;
  uv.x *= uResolution.x/uResolution.y;

  float t = uTime*0.05;
  float f = fbm(uv*1.2 + vec2(t, -t));
  vec3 album = mix(uColor1, uColor2, 0.5+0.5*sin(uTime*0.2));
  vec3 base = mix(uAlbumAvg, album, uAlbumOn);
  vec3 col = mix(base, vec3(0.05,0.08,0.12), 0.25 + 0.35*(1.0-uEnergy));

  col *= 0.8 + 0.4*clamp(uCentroid,0.0,1.0);
  col += 0.12 * f * vec3(0.4,0.6,1.0);

  float r = length(uv);
  col *= smoothstep(1.15, 0.2, r);

  gl_FragColor = vec4(col, 1.0);
}