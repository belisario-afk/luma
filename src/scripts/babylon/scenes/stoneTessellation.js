// Stone Tessellation — textured kaleidoscopic relief via shader.

export function buildStoneTessellation(scene) {
  const B = window.BABYLON;

  const plane = B.MeshBuilder.CreatePlane('fsqStone', { size: 2 }, scene);
  plane.position.z = 0.1;

  const shader = new B.ShaderMaterial('stone', scene, {
    vertexElement: 'custom2',
    fragmentElement: 'custom2'
  }, {
    attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'iTime', 'iResolution', 'uEnergy', 'uBass', 'uVocal', 'uCentroid']
  });

  shader.backFaceCulling = false;

  const vert = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;
  const frag = `
    precision highp float;
    uniform float iTime; uniform vec2 iResolution;
    uniform float uEnergy; uniform float uBass; uniform float uVocal; uniform float uCentroid;
    varying vec2 vUv;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
      vec2 u=f*f*(3.0-2.0*f);
      return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
    }
    float fbm(vec2 p){
      float v=0.0, a=0.5;
      for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; }
      return v;
    }

    vec2 kaleido(vec2 p, float k){
      float a = atan(p.y,p.x), r = length(p);
      a = mod(a, 6.2831853/k);
      a = abs(a - 3.14159265/k);
      return vec2(cos(a), sin(a))*r;
    }

    void main(){
      vec2 uv = vUv*2.0-1.0;
      uv.x *= iResolution.x/iResolution.y;
      float t = iTime;

      float seg = 4.0 + floor(6.0*uCentroid);
      vec2 p = kaleido(uv, seg);
      p += 0.14*vec2(sin(0.7*t + p.y*1.2), cos(0.6*t - p.x*1.1));

      float m = fbm(p*2.0 + vec2(0.2*sin(t*0.3), 0.2*cos(t*0.25)));
      float ridge = abs(m - 0.5);
      float carve = smoothstep(0.35, 0.0, ridge);

      vec3 pal = mix(vec3(0.22,0.25,0.35), vec3(0.75,0.65,0.95), carve);
      vec3 col = pal * (0.7 + 0.9*uEnergy + 0.4*uBass) + 0.08*uVocal;

      col *= smoothstep(1.2, 0.25, length(uv));
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  B.Effect.ShadersStore['custom2VertexShader'] = vert;
  B.Effect.ShadersStore['custom2FragmentShader'] = frag;
  plane.material = shader;

  const start = performance.now();
  const onResize = () => {
    shader.setVector2('iResolution',
      new B.Vector2(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight()));
  };
  onResize();
  scene.getEngine().onResizeObservable.add(onResize);

  return (bands) => {
    const t = (performance.now() - start) / 1000;
    shader.setFloat('iTime', t);
    shader.setFloat('uEnergy', Math.max(0, Math.min(1, bands?.energy ?? 0)));
    shader.setFloat('uBass', Math.max(0, Math.min(1, bands?.bass?.avg ?? 0)));
    shader.setFloat('uVocal', Math.max(0, Math.min(1, bands?.vocal?.avg ?? 0)));
    shader.setFloat('uCentroid', Math.max(0, Math.min(1, bands?.centroid ?? 0)));
  };
}