#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform vec2 uResolution; uniform float uVocal; uniform float uFlux; uniform float uCentroid; uniform vec3 uColor2;
varying vec2 vUv;
vec2 kaleido(vec2 p, float k){
  float a = atan(p.y,p.x), r=length(p);
  a = mod(a, 6.28318/k); a = abs(a - 3.14159/k);
  return vec2(cos(a),sin(a))*r;
}
void main(){
  vec2 p = (gl_FragCoord.xy/uResolution.xy)*2.0-1.0; p.x*=uResolution.x/uResolution.y;
  float k = 5.0 + floor(5.0*uCentroid);
  vec2 q = kaleido(p, k);
  float t = uTime*0.5;
  float wave = sin(10.0*q.x + 8.0*q.y - t*(6.0*(0.7+0.6*uVocal)));
  float mask = smoothstep(0.25, 0.0, abs(wave)) * (0.5 + 1.1*uFlux);
  vec3 col = uColor2 * mask;
  col *= smoothstep(1.2,0.15,length(p));
  gl_FragColor = vec4(col,0.8);
}