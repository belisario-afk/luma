// liquidNeon.glsl
// Uses uTreble, uCentroid for neon flicker, uBeat for ring pulses, album texture tint.

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
uniform float uAlbumOn;
uniform float uParam1; // rippleSize
uniform float uParam2; // glow

varying vec2 vUv;

float sdCircle(vec2 p, float r) { return length(p) - r; }

void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;

  float t = uTime;
  float rippleSize = max(uParam1, 0.2);
  float glowParam = uParam2;

  float r = length(uv);

  // Radial ripples mixing bass & treble; centroid modulates frequency
  float k = 10.0 * rippleSize + 4.0*uBass + 6.0*uCentroid;
  float w = 2.0 + 6.0*uTreble;
  float wave = sin(r * k - t * w);
  float bands = 0.5 + 0.5*wave;

  // Neon gradient (album-aware)
  vec3 grad = mix(uColor1, uColor2, 0.5 + 0.5*sin(t*0.35 + uv.x*2.0));
  grad = mix(uAlbumAvg, grad, 0.6 + 0.4*(1.0 - step(0.5, uAlbumOn)));
  vec3 col = grad * (0.3 + 0.7*bands);

  // Grid distortion with treble flicker
  vec2 g = uv * (3.0 + 3.0*uTreble + 2.0*uCentroid);
  float grid = smoothstep(0.0, 0.02, abs(sin(g.x)) + abs(sin(g.y)));
  col += grid * vec3(0.2, 0.5, 0.9) * (0.4 + 0.8*uTreble);

  // Central aura with beat pulse
  float d = sdCircle(uv, 0.35 + 0.12*uBass + 0.06*uBeat);
  float aura = smoothstep(0.5, 0.0, abs(d));
  col += aura * (0.25 + 0.75*glowParam + 0.6*uBeat) * vec3(0.9, 0.6, 1.0);

  // Album texture subtle overlay
  if (uAlbumOn > 0.5) {
    vec2 suv = 0.5 + 0.5 * (uv * (1.0 + 0.1*uCentroid));
    vec3 texCol = texture2D(uAlbumTex, suv).rgb;
    col = mix(col, texCol, 0.10);
  }

  // vignette
  col *= smoothstep(1.2, 0.2, r);

  gl_FragColor = vec4(col, 1.0);
}