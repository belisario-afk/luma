#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform vec2 uResolution; uniform float uBass; uniform float uBeat; uniform vec3 uColor1;
varying vec2 vUv;
void main(){
  vec2 p = (gl_FragCoord.xy/uResolution.xy)*2.0-1.0; p.x*=uResolution.x/uResolution.y;
  float r=length(p);
  // Expanding rings mainly on downbeats
  float pulse = fract(uTime*0.5 + uBeat*0.25);
  float ring = smoothstep(0.03, 0.0, abs(r - (0.25 + 0.25*pulse)));
  float warp = 0.05*sin(10.0*r - uTime*5.0);
  float band = smoothstep(0.01,0.0,abs(sin((r+warp)*20.0)));
  vec3 col = uColor1 * (0.6*ring + 0.2*band + 0.2*uBass);
  col *= smoothstep(1.1,0.2,r);
  gl_FragColor=vec4(col,0.9);
}