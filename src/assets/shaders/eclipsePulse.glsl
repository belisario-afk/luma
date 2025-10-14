#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform float uTreble; uniform vec2 uResolution; uniform vec3 uColor1; uniform vec3 uColor2;
void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float r = length(uv);
  float ringR = 0.45 + 0.03*sin(uTime*1.1);
  float edge = smoothstep(0.01, 0.0, abs(r - ringR));
  vec3 ring = mix(uColor2, uColor1, edge);
  float glow = smoothstep(0.6, 0.0, r) * (0.1 + 0.9*uTreble);
  ring += glow * vec3(1.0, 0.8, 0.4);
  float dark = smoothstep(ringR, ringR - 0.1, r);
  vec3 col = ring * dark;
  gl_FragColor = vec4(col, 1.0);
}