// lofiMist.glsl
// Soft noise-based fog with subtle sparkles reacting to mid.

#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform float uMid;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
}

void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;

  float n = noise(uv * 1.5 + uTime*0.05);
  float fog = smoothstep(0.2, 1.0, n + 0.3*uMid);
  vec3 base = mix(uColor2, uColor1, fog);

  // sparkles
  float s = step(0.995, fract(sin(dot(uv*10.0 + uTime, vec2(12.9898,78.233))) * 43758.5453));
  vec3 col = base + s * vec3(1.0, 1.0, 1.0) * 0.15;

  gl_FragColor = vec4(col, 1.0);
}