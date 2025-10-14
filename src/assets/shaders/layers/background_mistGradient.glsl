#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform vec2 uResolution; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uAlbumAvg; uniform float uAlbumOn; uniform float uEnergy;
varying vec2 vUv;
void main(){
  vec2 uv = gl_FragCoord.xy/uResolution.xy;
  float g = smoothstep(0.15,0.85, uv.y + 0.05*sin(uTime*0.15));
  vec3 base = mix(uAlbumAvg, mix(uColor1,uColor2,g), uAlbumOn);
  float fog = 0.12 + 0.25*(1.0-uEnergy);
  vec3 col = mix(base*0.7, base*1.05, g) + fog;
  float vign = smoothstep(0.95, 0.2, length(uv*2.0-1.0));
  col *= vign;
  gl_FragColor = vec4(col,1.0);
}