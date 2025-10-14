#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform vec2 uResolution;
uniform float uBass, uVocal, uTreble, uEnergy, uBeat, uCentroid, uFlux;
uniform sampler2D tBG, tBass, tVocal, tTreble;
uniform float uWBass, uWVocal, uWTreble;
varying vec2 vUv;
vec3 screenBlend(vec3 a, vec3 b){ return 1.0 - (1.0 - a)*(1.0 - b); }
vec3 softLight(vec3 a, vec3 b){ return (1.0-2.0*b)*a*a + 2.0*b*a; }
vec3 blur(sampler2D t, vec2 uv, vec2 res){
  vec2 px = 1.0/res;
  vec3 c=vec3(0.0);
  c += texture2D(t, uv).rgb*0.24;
  c += texture2D(t, uv+vec2(px.x,0.)).rgb*0.125;
  c += texture2D(t, uv+vec2(-px.x,0.)).rgb*0.125;
  c += texture2D(t, uv+vec2(0.,px.y)).rgb*0.125;
  c += texture2D(t, uv+vec2(0.,-px.y)).rgb*0.125;
  c += texture2D(t, uv+vec2(px.x,px.y)).rgb*0.06;
  c += texture2D(t, uv+vec2(-px.x,px.y)).rgb*0.06;
  c += texture2D(t, uv+vec2(px.x,-px.y)).rgb*0.06;
  c += texture2D(t, uv+vec2(-px.x,-px.y)).rgb*0.06;
  return c;
}
void main(){
  vec2 uv = gl_FragCoord.xy/uResolution.xy;

  vec3 bg = texture2D(tBG, uv).rgb;
  vec3 lb = texture2D(tBass, uv).rgb;
  vec3 lv = texture2D(tVocal, uv).rgb;
  vec3 lt = texture2D(tTreble, uv).rgb;

  float wBass = clamp((0.25 + 1.2*uBass + 0.8*uBeat) * uWBass, 0.0, 1.3);
  float wVocal = clamp((0.20 + 1.0*uVocal + 0.8*uFlux) * uWVocal, 0.0, 1.2);
  float wTreble = clamp((0.15 + 1.0*uTreble + 0.4*uCentroid) * uWTreble, 0.0, 1.1);

  vec3 col = bg;
  col = screenBlend(col, lb * wBass);
  col = softLight(col, lv * wVocal);
  col += lt * (0.55 * wTreble);

  // subtle bloom from bright parts
  vec3 bloom = blur(tVocal, uv, uResolution) * 0.25 + blur(tTreble, uv, uResolution) * 0.2;
  col = screenBlend(col, bloom * (0.3 + 0.7*uEnergy));

  // global lift
  col *= 0.85 + 0.5*uEnergy;

  gl_FragColor = vec4(col, 1.0);
}