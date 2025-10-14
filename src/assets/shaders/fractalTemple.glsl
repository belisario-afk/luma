// fractalTemple.glsl
// Now reacts to uBeat, uEnergy, uCentroid and can tint with album colors/texture.

#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uEnergy;
uniform float uCentroid;
uniform float uBeat;
uniform vec2  uResolution;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uAlbumAvg;
uniform sampler2D uAlbumTex;
uniform float uAlbumOn; // 0.0 or 1.0

varying vec2 vUv;

float mandel(vec2 c) {
  vec2 z = vec2(0.0);
  float m = 0.0;
  for (int i=0; i<80; i++) {
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
    if (dot(z, z) > 4.0) break;
    m += 1.0;
  }
  return m / 80.0;
}

void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;

  float t = uTime * 0.25;
  float breathe = 0.5 + 0.5 * sin(uTime * (0.8 + 1.5*uMid));
  float zoom = mix(1.9, 0.85, breathe + 0.25*uBass + 0.2*uEnergy);

  // subtle rotation, accent on beat
  float ang = 0.12 * uTime + 0.15 * uBeat;
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 p = R * (uv / zoom) + vec2(0.25*sin(t), 0.2*cos(0.7*t));

  float m = mandel(p);
  float edge = smoothstep(0.2, 0.9, m);

  // Base palette (can be album-driven)
  vec3 colA = mix(uAlbumAvg, uColor1, 0.5 + 0.5*uAlbumOn);
  vec3 colB = mix(uAlbumAvg, uColor2, 0.5 + 0.5*uAlbumOn);
  vec3 col = mix(colB, colA, pow(edge, 1.1 + 0.9*uBass));

  // Album texture overlay (very soft)
  if (uAlbumOn > 0.5) {
    vec2 suv = 0.5 + 0.5 * uv;
    // center sample and swirl slightly with centroid
    vec2 suv2 = vec2(
      suv.x + 0.03*sin(6.2831*suv.y + uTime*0.2 + uCentroid*3.0),
      suv.y + 0.03*cos(6.2831*suv.x - uTime*0.2 + uCentroid*3.0)
    );
    vec3 texCol = texture2D(uAlbumTex, suv2).rgb;
    col = mix(col, texCol, 0.12);
  }

  // Glow blooms more on beat and bass
  float r = length(uv);
  float grain = fract(sin(dot(uv, vec2(12.9898,78.233))) * 43758.5453);
  float glow = smoothstep(0.75, 1.0, m) * (0.15 + 1.0*uBass + 0.6*uBeat) + 0.06*grain;
  col += glow * vec3(1.0, 0.85, 0.55);

  // vignette
  col *= smoothstep(1.2, 0.2, r);

  gl_FragColor = vec4(col, 1.0);
}