#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform vec2 uResolution; uniform float uBass; uniform float uSub; uniform float uBeat; uniform vec3 uColor1;
varying vec2 vUv;
void main(){
  vec2 p = (gl_FragCoord.xy/uResolution.xy)*2.0-1.0; p.x*=uResolution.x/uResolution.y;
  float r=length(p);
  float k = 12.0 + 24.0*uBass;
  float w = 3.0 + 5.0*(0.6+uSub);
  float rip = sin(k*r - uTime*w);
  float rings = smoothstep(0.015,0.0,abs(rip))* (0.4 + 0.6*uBass);
  float shock = smoothstep(0.04, 0.0, abs(r - (0.3 + 0.1*uBeat)));
  vec3 col = uColor1 * (0.25*rings + 0.7*shock);
  col *= smoothstep(1.1,0.2,r);
  gl_FragColor=vec4(col,0.85);
}