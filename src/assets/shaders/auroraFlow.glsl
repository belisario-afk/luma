// auroraFlow.glsl
// Flowing aurora ribbons, bass influences flow amplitude.

#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform float uBass;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uResolution.x / uResolution.y;

  float t = uTime * 0.25;
  float wave = sin(p.x*3.0 + t*2.0) + sin(p.x*7.0 - t*1.2);
  float flow = abs(wave) * (0.4 + 1.2*uBass);

  vec3 col = mix(uColor2, uColor1, smoothstep(0.2, 0.9, p.y + flow*0.2));
  col *= smoothstep(1.1, 0.2, length(p));
  gl_FragColor = vec4(col, 1.0);
}