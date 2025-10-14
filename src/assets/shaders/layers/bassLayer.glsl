#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform vec2  uResolution;
uniform float uSub;
uniform float uBass;
uniform float uBeat;
uniform vec3  uColor1;

varying vec2 vUv;

void main(){
  vec2 uv = (gl_FragCoord.xy/uResolution.xy)*2.0-1.0;
  uv.x *= uResolution.x/uResolution.y;

  float r = length(uv);
  float ang = atan(uv.y, uv.x);

  float ringR = 0.35 + 0.15*uBass + 0.08*uBeat;
  float ring = smoothstep(0.03, 0.0, abs(r - ringR));

  float disp = (0.05 + 0.15*uSub) * sin(12.0*r - uTime*6.0*(0.6+0.8*uBeat));
  float bands = smoothstep(0.0, 0.02, abs(sin(ang*8.0 + disp)));

  vec3 col = mix(vec3(0.0), uColor1, 0.6*ring + 0.4*bands);
  col *= smoothstep(1.1, 0.2, r);

  gl_FragColor = vec4(col, 0.9);
}