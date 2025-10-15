// Infinite Drop SDF Tunnel (Babylon ShaderMaterial, WebGPU-first with WebGL2 fallback)
// Reactivity:
//  - uBass/uEnergy → drop speed and twist
//  - uTreble/uCentroid → highlight intensity & hue shift
//  - uBeat → shock pulse on surfaces

export function buildInfiniteDropSDF(scene) {
  const B = window.BABYLON;

  const plane = B.MeshBuilder.CreatePlane('fsqInfinite', { size: 2 }, scene);
  plane.position.z = 0.1;

  const shader = new B.ShaderMaterial('infdrop', scene, {
    vertexElement: 'infdropVS',
    fragmentElement: 'infdropFS'
  }, {
    attributes: ['position', 'uv'],
    uniforms: [
      'worldViewProjection',
      'iTime', 'iResolution',
      'uBass', 'uEnergy', 'uTreble', 'uBeat', 'uCentroid'
    ]
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
    uniform float iTime;
    uniform vec2  iResolution;
    uniform float uBass, uEnergy, uTreble, uBeat, uCentroid;
    varying vec2 vUv;

    // --- utility ---
    mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

    float sdBox(vec3 p, vec3 b){
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    }

    // Domain repeat along Z
    vec3 repeatZ(vec3 p, float period){
      p.z = mod(p.z, period) - 0.5*period;
      return p;
    }

    // Signed distance field for a twisted tunnel with ribs
    float map(in vec3 p, out float matId){
      matId = 0.0;
      // periodic structure every P along z
      const float P = 4.0;
      vec3 q = repeatZ(p, P);

      // twist amount increases with z; bass/energy modulate twist in time (wired externally via camera motion)
      float twist = 0.6*q.z;
      q.xy = rot(twist) * q.xy;

      // base tunnel radius with small undulation
      float radius = 0.85 + 0.18*sin(q.z*3.0);
      float tunnel = length(q.xy) - radius; // 0 at tunnel wall

      // Decorative ribs: thin boxes arranged around circumference
      float angCells = 12.0;
      float a = atan(q.y, q.x);
      float cell = floor((a + 3.14159) / (6.28318 / angCells));
      float band = abs(fract((a + 3.14159) / (6.28318 / angCells)) - 0.5);
      vec3 ribP = q;
      // push inward to make thin bands on the wall
      ribP.xy = normalize(q.xy) * (radius - 0.05) + (q.xy - normalize(q.xy)*radius);
      float ribs = sdBox(ribP, vec3(0.06, 0.01 + 0.02*band, 0.9));

      // Combine: take max to carve ribs into tunnel wall
      float d = min(tunnel, max(-0.04, ribs)); // clamp ribs influence

      // small boxes (studs) on the wall
      vec3 stud = q;
      stud.xy = normalize(q.xy) * (radius - 0.02) + (q.xy - normalize(q.xy)*radius);
      float studs = sdBox(stud + vec3(0.0,0.0,0.0), vec3(0.02,0.02,0.2));
      d = min(d, studs);

      // mark material for simple shading differences
      matId = (abs(d - tunnel) < 0.001) ? 1.0 : 2.0;
      return d;
    }

    vec3 calcNormal(in vec3 p){
      const float e = 0.0015;
      float id;
      vec2 h = vec2(1.0, -1.0)*0.5773;
      return normalize(
        h.xyy * map(p + h.xyy*e, id) +
        h.yyx * map(p + h.yyx*e, id) +
        h.yxy * map(p + h.yxy*e, id) +
        h.xxx * map(p + h.xxx*e, id)
      );
    }

    // simple AO
    float ao(in vec3 p, in vec3 n){
      float acc = 0.0;
      float sca = 1.0;
      float id;
      for(int i=0;i<5;i++){
        float h = 0.08 + 0.12*float(i);
        float d = map(p + n*h, id);
        acc += (h - d)*sca;
        sca *= 0.7;
      }
      return clamp(1.0 - 1.2*acc, 0.0, 1.0);
    }

    vec3 hsv2rgb(vec3 c){
      vec3 p = abs(fract(c.xxx + vec3(0.,2./3.,1./3.))*6.-3.);
      return c.z * mix(vec3(1.0), clamp(p-1.0,0.0,1.0), c.y);
    }

    void main(){
      vec2 uv = vUv * 2.0 - 1.0;
      uv.x *= iResolution.x / iResolution.y;

      // Reactive drop speed and subtle twist
      float speed = 0.65 + 1.8*(0.6*uBass + 0.4*uEnergy);
      float t = iTime * speed;

      // Camera
      vec3 ro = vec3(0.0, 0.0, -t * 4.0); // drop forward (positive "infinity" by marching toward +z due to repeat)
      // Slight reactive roll
      float roll = 0.15*sin(0.7*t) + 0.25*uCentroid;
      vec3 rd = normalize(vec3(uv * rot(roll), 1.6)); // forward

      // Ray march
      float total = 0.0;
      float matId = 0.0;
      vec3 p;
      float d;
      bool hit = false;
      for(int i=0;i<120;i++){
        p = ro + rd * total;
        d = map(p, matId);
        if (d < 0.001) { hit = true; break; }
        total += d * 0.9;
        if (total > 100.0) break;
      }

      vec3 col = vec3(0.0);
      if (hit){
        vec3 n = calcNormal(p);
        // lighting
        vec3 ldir = normalize(vec3(0.6, 0.7, 0.3));
        float diff = clamp(dot(n, ldir), 0.0, 1.0);
        float amb = 0.35;
        float occ = ao(p, n);

        // Hue based on angular position + depth; treble brightens, centroid shifts hue
        float hue = fract(0.15 + 0.18*atan(p.y, p.x)/3.14159 + 0.04*p.z + 0.08*uCentroid);
        vec3 base = hsv2rgb(vec3(hue, 0.85, 1.0));

        // Pulse on beat
        float pulse = 0.15 + 0.85*uBeat;

        // Material tweak
        float msel = (matId < 1.5) ? 0.9 : 1.1;

        col = base * (amb + diff*msel) * occ;
        col *= (0.80 + 0.55*uEnergy);
        col += 0.12*pulse;
        // mild rim
        float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        col += rim * (0.2 + 0.6*uTreble);
      }

      // Vignette
      float r = length(uv);
      col *= smoothstep(1.2, 0.2, r);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const BJS = window.BABYLON;
  BJS.Effect.ShadersStore['infdropVS'] = vert;
  BJS.Effect.ShadersStore['infdropFS'] = frag;
  plane.material = shader;

  const start = performance.now();

  const onResize = () => {
    shader.setVector2('iResolution',
      new B.Vector2(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight())
    );
  };
  onResize();
  scene.getEngine().onResizeObservable.add(onResize);

  return (bands) => {
    const t = (performance.now() - start) / 1000;
    shader.setFloat('iTime', t);

    const clamp01 = (x)=>Math.max(0, Math.min(1, x));
    shader.setFloat('uBass',      clamp01(bands?.bass?.avg ?? 0));
    shader.setFloat('uEnergy',    clamp01(bands?.energy ?? 0));
    shader.setFloat('uTreble',    clamp01(bands?.treble?.avg ?? 0));
    shader.setFloat('uBeat',      clamp01(bands?.beatPulse ?? 0));
    shader.setFloat('uCentroid',  clamp01(bands?.centroid ?? 0));
  };
}