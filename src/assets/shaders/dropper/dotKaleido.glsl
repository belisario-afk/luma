#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform vec2  uResolution;
uniform float uVocal, uFlux, uTreble, uCentroid, uEnergy, uBeat;
uniform vec3  uColor1, uColor2, uAlbumAvg;
uniform float uAlbumOn;

varying vec2 vUv;

vec2 kaleido(vec2 p, float k){
  float a = atan(p.y,p.x), r = length(p);
  a = mod(a, 6.2831853/k);
  a = abs(a - 3.14159265/k);
  return vec2(cos(a), sin(a))*r;
}

float dotBlob(vec2 p, float r){
  return smoothstep(r, 0.0, length(p));
}

void main(){
  vec2 uv = (gl_FragCoord.xy/uResolution.xy)*2.0-1.0;
  uv.x *= uResolution.x/uResolution.y;

  float t = uTime;
  float seg = 6.0 + floor(10.0*uCentroid); // kaleido segments
  vec2 p = kaleido(uv, seg);

  // Orbiting dotted field (rings × angle cells)
  float rings = mix(10.0, 22.0, 0.4 + 0.6*uVocal);
  float ringId = floor(length(p)*rings + 0.001);
  float ringFrac = fract(length(p)*rings);

  float cells = 24.0 + 24.0*uTreble;
  float ang = atan(p.y,p.x);
  float cellId = floor((ang/(2.0*3.14159265))*cells);
  float cellFrac = fract((ang/(2.0*3.14159265))*cells);

  // Animate centers with small offsets
  float cr = 0.5 + 0.5*sin(t*0.8 + ringId*0.7 + cellId*0.3);
  vec2 center = vec2( (cellFrac-0.5)*0.9, (ringFrac-0.5)*0.22 );
  center += 0.07*vec2(sin(t*0.6+ringId), cos(t*0.5+cellId));

  float size = mix(0.035, 0.09, 0.4 + 0.6*uVocal) * (1.0 + 0.35*uFlux);
  float blob = dotBlob(p - center, size);

  // accumulate a few neighbors for density feel
  float blob2 = dotBlob(p - (center+vec2(0.22,0.0)), size*0.85);
  float blob3 = dotBlob(p - (center+vec2(-0.22,0.0)), size*0.85);
  float field = clamp(blob + blob2*0.8 + blob3*0.8, 0.0, 1.0);

  vec3 pal = mix(uAlbumAvg, mix(uColor1,uColor2,0.5+0.5*sin(t*0.25)), uAlbumOn);
  vec3 col = pal * (0.15 + 0.95*field);

  // treble sparkles
  col += vec3(1.0,0.9,1.0) * field * 0.25 * uTreble;

  // dark background preserve
  col *= smoothstep(1.2, 0.2, length(uv));
  col *= 0.85 + 0.5*uEnergy;
  col += 0.12*uBeat;

  gl_FragColor = vec4(col, 1.0);
}