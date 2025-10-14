#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform vec2 uResolution; uniform float uTreble; varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy/uResolution.xy;
  float t = uTime;
  // Random bokeh circles
  vec2 cell = floor(uv*vec2(20.0 + 40.0*uTreble));
  vec2 f = fract(uv*vec2(20.0 + 40.0*uTreble));
  float rnd = hash(cell);
  vec2 center = vec2(0.5+0.2*sin(rnd*50.0+t*0.2), 0.5+0.2*cos(rnd*40.0-t*0.25));
  float d = distance(f, center);
  float b = smoothstep(0.5, 0.0, d) * step(0.8, rnd) * (0.3 + 0.9*uTreble);
  vec3 col = vec3(b);
  gl_FragColor = vec4(col, 0.6);
}