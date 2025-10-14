#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform vec2  uResolution;
uniform float uVocal;
uniform float uFlux;
uniform float uCentroid;
uniform vec3  uColor2;

varying vec2 vUv;

vec2 kaleido(vec2 p, float k){
  float a = atan(p.y,p.x);
  float r = length(p);
  a = mod(a, 6.28318/k);
  a = abs(a - 3.14159/k);
  return vec2(cos(a), sin(a))*r;
}

void main(){
  vec2 uv = (gl_FragCoord.xy/uResolution.xy)*2.0-1.0;
  uv.x *= uResolution.x/uResolution.y;

  float k = 6.0 + floor(6.0*uCentroid);
  vec2 p = kaleido(uv, k);

  float t = uTime*0.5;
  float wave = sin(10.0*p.x + 8.0*p.y - t*6.0*(0.7+0.6*uVocal)) * (0.7 + 1.2*uVocal + 1.0*uFlux);
  float mask = smoothstep(0.2, 0.0, abs(wave));

  vec3 col = mix(vec3(0.0), uColor2, mask);
  col *= smoothstep(1.2, 0.15, length(uv));

  gl_FragColor = vec4(col, 0.75);
}