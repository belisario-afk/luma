#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform vec2  uResolution;
uniform float uTreble, uEnergy, uBass, uBeat, uCentroid;
uniform vec3  uColor1, uColor2, uAlbumAvg;
uniform float uAlbumOn;

varying vec2 vUv;

vec3 hsv2rgb(vec3 c){
  vec3 p = abs(fract(c.xxx + vec3(0.,2./3.,1./3.))*6.-3.);
  return c.z * mix(vec3(1.0), clamp(p-1.0,0.0,1.0), c.y);
}

void main(){
  vec2 uvn = gl_FragCoord.xy/uResolution.xy;
  vec2 uv = uvn*2.0-1.0;
  uv.x *= uResolution.x/uResolution.y;

  float t = uTime;
  float r = length(uv);
  float a = atan(uv.y, uv.x);

  // radial starlines with pixelation
  float rays = 6.0 + 14.0*clamp(uTreble,0.0,1.0);
  float star = smoothstep(0.15, 0.0, abs(sin(a*rays)));

  // pixel grid size reacts to treble and centroid
  float g = mix(120.0, 40.0, clamp(0.6*uTreble + 0.4*uCentroid,0.0,1.0));
  vec2 grid = floor(uvn*vec2(g, g*(uResolution.y/uResolution.x)))/vec2(g, g*(uResolution.y/uResolution.x));

  float zoom = 1.0/(0.35 + r*1.4);
  float hue = fract(0.3 + 0.35*a/6.2831 + 0.25*zoom + 0.1*t);
  vec3 rainbow = hsv2rgb(vec3(hue, 0.85, 1.0));

  vec3 album = mix(uAlbumAvg, mix(uColor1,uColor2,0.5+0.5*sin(0.4*t)), uAlbumOn);
  vec3 base = mix(album, rainbow, 0.8);

  // motion blur-ish smear along rays
  float smear = smoothstep(0.0, 0.8, star)*(0.4 + 0.8*uEnergy);
  vec3 col = base*(0.15 + 0.85*smear);

  // glitchy beat slices
  float beatShift = step(0.8, uBeat) * 0.003 * sin(120.0*grid.y + t*50.0);
  col = mix(col, col.bgr, 0.18*uTreble);
  col += vec3(beatShift, -beatShift, 0.0);

  // vignette and global lift
  col *= smoothstep(1.15, 0.18, r);
  col *= 0.85 + 0.55*uEnergy;

  gl_FragColor = vec4(col, 1.0);
}