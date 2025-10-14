#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform vec2  uResolution;
uniform float uTreble;
uniform float uZcr;

varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

void main(){
  vec2 uv = (gl_FragCoord.xy/uResolution.xy);
  vec2 p = uv*vec2(uResolution.x/uResolution.y,1.0)*2.0-1.0;

  vec2 grid = floor(uv*vec2(80.0 + 140.0*uTreble));
  float rnd = hash(grid);
  float blink = step(0.995 - 0.25*uTreble, rnd + 0.02*sin(uTime*10.0 + rnd*50.0));

  float scan = 0.15 * smoothstep(0.0, 0.7, sin(uv.y*800.0 + uTime*30.0*(0.5+uZcr)));

  vec3 col = vec3( blink ) + vec3(scan, scan*0.6, scan*1.1);
  col *= 0.8 + 0.8*uTreble;

  col *= smoothstep(1.1, 0.1, length(p));

  gl_FragColor = vec4(col, 0.65);
}