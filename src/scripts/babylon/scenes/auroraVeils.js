// Aurora Veils — flowing ribbon shader on a full-screen quad.
// Drivers: energy (brightness), centroid (tip brightness), bass (ripple amplitude)

export function buildAuroraVeils(scene) {
  const B = window.BABYLON;

  const plane = B.MeshBuilder.CreatePlane('fsq', { size: 2 }, scene);
  plane.position.z = 0.1; // slightly forward

  const shader = new B.ShaderMaterial('aurora', scene, {
    vertexElement: 'custom',
    fragmentElement: 'custom'
  }, {
    attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'iTime', 'iResolution', 'uEnergy', 'uBass', 'uCentroid']
  });

  shader.setFloat('iTime', 0);
  shader.setVector2('iResolution', new B.Vector2(1, 1));
  shader.backFaceCulling = false;

  // Attach simple shader code
  const vert = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;
  const frag = `
    precision highp float;
    uniform float iTime;
    uniform vec2 iResolution;
    uniform float uEnergy;
    uniform float uBass;
    uniform float uCentroid;
    varying vec2 vUv;

    float noise(vec2 p){
      return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
    }

    void main(){
      vec2 uv = vUv * 2.0 - 1.0;
      uv.x *= iResolution.x / iResolution.y;

      float t = iTime * 0.25;
      float a = sin(uv.x*3.0 + t*2.0) + sin(uv.x*7.0 - t*1.2);
      float flow = abs(a) * (0.3 + 1.2*uBass);

      vec3 col = mix(vec3(0.08,0.18,0.32), vec3(0.2,0.85,1.0), smoothstep(0.1, 0.9, uv.y + 0.25*flow));
      col += 0.25 * uCentroid;

      // energy lifts exposure
      col *= (0.8 + 0.6*uEnergy);

      float r = length(uv);
      col *= smoothstep(1.2, 0.2, r);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  B.Effect.ShadersStore['customVertexShader'] = vert;
  B.Effect.ShadersStore['customFragmentShader'] = frag;
  plane.material = shader;

  const start = performance.now();
  // Resize hook
  const onResize = () => {
    const w = scene.getEngine().getRenderWidth();
    const h = scene.getEngine().getRenderHeight();
    shader.setVector2('iResolution', new B.Vector2(w, h));
  };
  onResize();
  scene.getEngine().onResizeObservable.add(onResize);

  return (bands) => {
    const t = (performance.now() - start) / 1000;
    shader.setFloat('iTime', t);
    const energy = Math.max(0, Math.min(1, bands?.energy ?? 0));
    const bass = Math.max(0, Math.min(1, bands?.bass?.avg ?? 0));
    const centroid = Math.max(0, Math.min(1, bands?.centroid ?? 0));
    shader.setFloat('uEnergy', energy);
    shader.setFloat('uBass', bass);
    shader.setFloat('uCentroid', centroid);
  };
}