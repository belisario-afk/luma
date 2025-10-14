#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform vec2 uResolution; uniform float uTreble; uniform float uZcr; varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy/uResolution.xy;
  vec2 g = floor(uv*vec2(90.0));
  float rnd = hash(g);
  float tw = 0.5 + 0.5*sin(uTime*10.0 + rnd*50.0);
  float s = step(0.992 - 0.3*uTreble, rnd) * (0.2 + 0.8*tw*(0.7+0.3*uZcr));
  gl_FragColor = vec4(vec3(s), 0.7);
}