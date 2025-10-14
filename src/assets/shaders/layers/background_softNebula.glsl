#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform vec2 uResolution; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uAlbumAvg; uniform float uAlbumOn; uniform float uEnergy; uniform float uCentroid;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1)); vec2 u=f*f*(3.0-2.0*f); return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y; }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.02; a*=0.5; } return v; }
void main(){
  vec2 uv = (gl_FragCoord.xy/uResolution.xy)*2.0-1.0; uv.x*=uResolution.x/uResolution.y;
  float t = uTime*0.03;
  vec2 flow = vec2(sin(t*0.7), cos(t*0.6))*0.4;
  float n = fbm(uv*1.1 + flow);
  vec3 album = mix(uAlbumAvg, mix(uColor1,uColor2,0.5+0.5*sin(uTime*0.2)), uAlbumOn);
  vec3 col = mix(album*0.6, album*1.3, smoothstep(0.2,0.9,n));
  col *= 0.8 + 0.4*uCentroid;
  col *= 0.8 + 0.5*uEnergy;
  float r=length(uv);
  col *= smoothstep(1.15,0.2,r);
  gl_FragColor=vec4(col,1.0);
}