#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform vec2  uResolution;
uniform float uBass, uEnergy, uTreble, uBeat, uCentroid;
uniform vec3  uColor1, uColor2;
uniform vec3  uAlbumAvg;
uniform float uAlbumOn;

varying vec2 vUv;

vec3 hsv2rgb(vec3 c){
  vec3 p = abs(fract(c.xxx + vec3(0.,2./3.,1./3.))*6.-3.);
  return c.z * mix(vec3(1.0), clamp(p-1.0,0.0,1.0), c.y);
}

void main(){
  vec2 uv = (gl_FragCoord.xy/uResolution.xy)*2.0-1.0;
  uv.x *= uResolution.x/uResolution.y;

  float t = uTime;
  float rotSpeed = mix(0.15, 2.0, clamp(uBass,0.0,1.0));
  float zoom = mix(0.9, 1.35, clamp(uEnergy,0.0,1.0));
  float twist = mix(0.8, 1.4, 0.4 + 0.6*uCentroid);

  // polar
  float r = length(uv);
  float a = atan(uv.y, uv.x);

  // logarithmic spiral coordinate: s increases along spiral arms
  float k = twist; // tightness
  float s = a + k*log(r+1e-3) - t*rotSpeed;

  // number of arms and dash frequency
  float arms = mix(7.0, 13.0, clamp(uTreble,0.,1.));
  float armMask = smoothstep(0.18, 0.0, abs(fract(s*arms)*2.0-1.0));

  float dashFreq = mix(35.0, 65.0, 0.5+0.5*uTreble);
  float dash = smoothstep(0.36, 0.0, abs(fract(r*dashFreq + 0.12*sin(5.0*s))*2.0-1.0));

  // radial tunnel falloff + beat pulse expansion
  float pulse = smoothstep(0.0, 0.6, 0.25 + 0.75*uBeat);
  float tunnel = pow(1.0 - clamp(r/zoom, 0.0, 1.0), 1.2) + 0.22*pulse;

  float mask = armMask * dash * tunnel;

  // hue along spiral, animated
  float hue = fract(0.05 + 0.16*s + 0.07*uTime);
  vec3 rainbow = hsv2rgb(vec3(hue, 0.85, 1.0));

  // album palette influence
  vec3 baseA = mix(uColor1, uColor2, 0.5 + 0.5*sin(0.6*uTime));
  vec3 album = mix(uAlbumAvg, baseA, uAlbumOn);
  vec3 col = mix(album, rainbow, 0.75);

  // brightness shaped by energy and treble sparkle
  float sparkle = 0.12 + 0.88*uTreble;
  col *= (0.25 + 1.35*mask) * (0.8 + 0.3*uEnergy) + sparkle*0.05;

  // subtle vignette
  col *= smoothstep(1.2, 0.2, r);

  gl_FragColor = vec4(col, 1.0);
}