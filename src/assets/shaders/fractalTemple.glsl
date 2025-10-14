// Legacy single-pass preset kept for reference (not used by layered engine)
#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform float uBass; uniform float uMid; uniform float uTreble; uniform vec2 uResolution; uniform vec3 uColor1; uniform vec3 uColor2;
float mandel(vec2 c){ vec2 z=vec2(0.0); float m=0.0; for(int i=0;i<80;i++){ z=vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c; if(dot(z,z)>4.0) break; m+=1.0;} return m/80.0;}
void main(){
  vec2 uv=(gl_FragCoord.xy/uResolution.xy)*2.0-1.0; uv.x*=uResolution.x/uResolution.y;
  float t=uTime*0.25; float breathe=0.5+0.5*sin(uTime*(0.8+1.5*uMid)); float zoom=mix(1.8,0.9,breathe+0.25*uBass);
  float ang=0.15*uTime; mat2 R=mat2(cos(ang),-sin(ang),sin(ang),cos(ang));
  vec2 p=R*(uv/zoom)+vec2(0.25*sin(t),0.2*cos(0.7*t));
  float m=mandel(p); float edge=smoothstep(0.2,0.9,m);
  vec3 col=mix(uColor2,uColor1,pow(edge,1.2+0.8*uBass));
  float r=length(uv); col*=smoothstep(1.2,0.2,r);
  gl_FragColor=vec4(col,1.0);
}