#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform vec2 uResolution; uniform float uVocal; uniform float uFlux; uniform vec3 uColor2;
varying vec2 vUv;
void main(){
  vec2 p = (gl_FragCoord.xy/uResolution.xy)*2.0-1.0; p.x*=uResolution.x/uResolution.y;
  float t = uTime*0.6;
  float a = sin(p.y*3.0 + t*(1.2+0.6*uVocal));
  float b = sin(p.y*7.0 - t*(1.7+0.5*uVocal));
  float bands = smoothstep(0.2, 0.0, abs(p.x + 0.25*a + 0.12*b));
  float lift = 0.4 + 0.9*uVocal + 0.7*uFlux;
  vec3 col = uColor2 * (bands * lift);
  col *= smoothstep(1.2,0.15,length(p));
  gl_FragColor = vec4(col,0.75);
}