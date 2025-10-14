// breathingBloom.glsl
// Simple radial bloom that breathes with bass.

#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform float uBass;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;

void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;

  float r = length(uv);
  float breathe = 0.5 + 0.5 * sin(uTime * (0.8 + 2.0*uBass));
  float radius = mix(0.3, 0.6, breathe);
  float bloom = smoothstep(radius, radius - 0.25, r);

  vec3 col = mix(uColor2, uColor1, bloom);
  col *= smoothstep(1.2, 0.2, r);
  gl_FragColor = vec4(col, 1.0);
}