#ifdef GL_ES
precision mediump float;
#endif
uniform float uTime; uniform float uBass; uniform float uTreble; uniform vec2 uResolution; uniform vec3 uColor1; uniform vec3 uColor2; uniform float uParam1; uniform float uParam2;
float sdCircle(vec2 p,float r){return length(p)-r;}
void main(){
  vec2 uv=(gl_FragCoord.xy/uResolution.xy)*2.0-1.0; uv.x*=uResolution.x/uResolution.y;
  float t=uTime; float rippleSize=max(uParam1,0.2); float glowParam=uParam2;
  float r=length(uv); float wave=sin((r*(10.0*rippleSize+4.0*uBass))-(t*(2.0+5.0*uTreble))); float bands=0.5+0.5*wave;
  vec3 grad=mix(uColor1,uColor2,0.5+0.5*sin(t*0.3+uv.x*2.0)); vec3 col=grad*(0.3+0.7*bands);
  vec2 g=uv*(3.0+3.0*uTreble); float grid=smoothstep(0.0,0.02,abs(sin(g.x))+abs(sin(g.y))); col+=grid*vec3(0.2,0.5,0.8)*(0.5+0.8*uTreble);
  float d=sdCircle(uv,0.35+0.1*uBass); float aura=smoothstep(0.5,0.0,abs(d)); col+=aura*(0.25+0.75*glowParam)*vec3(0.9,0.6,1.0);
  col*=smoothstep(1.2,0.2,r); gl_FragColor=vec4(col,1.0);
}