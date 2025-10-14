#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform vec2 uResolution;
uniform float uBass, uVocal, uTreble, uEnergy, uBeat;
uniform sampler2D tBG, tBass, tVocal, tTreble;
uniform float uWBass, uWVocal, uWTreble;
varying vec2 vUv;
vec3 screenBlend(vec3 a, vec3 b){ return 1.0 - (1.0 - a)*(1.0 - b); }
void main(){
  vec2 uv = gl_FragCoord.xy/uResolution.xy;

  vec3 bg = texture2D(tBG, uv).rgb * 0.9;
  vec3 lb = texture2D(tBass, uv).rgb;
  vec3 lv = texture2D(tVocal, uv).rgb;
  vec3 lt = texture2D(tTreble, uv).rgb;

  float wBass = clamp((0.35 + 1.3*uBass + 1.0*uBeat) * uWBass, 0.0, 1.4);
  float wVocal = clamp((0.15 + 0.9*uVocal) * uWVocal, 0.0, 1.0);
  float wTreble = clamp((0.2 + 0.9*uTreble) * uWTreble, 0.0, 1.0);

  vec3 col = bg;
  col = screenBlend(col, lb * wBass);
  col = col * (1.0 - 0.5*wVocal) + lv * 0.5*wVocal;
  col += lt * (0.5 * wTreble);

  col *= 0.82 + 0.58*uEnergy;

  gl_FragColor = vec4(col, 1.0);
}