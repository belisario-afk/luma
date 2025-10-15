// Ring Flight — fly-through neon rings tunnel (true 3D), reactive scale/rotation/speed.

export function buildRingFlight(scene) {
  const B = window.BABYLON;

  const glow = new B.GlowLayer('glow', scene, { blurKernelSize: 32 });
  glow.intensity = 0.6;

  // Create a single torus and instance it as a tunnel
  const base = B.MeshBuilder.CreateTorus('ringBase', { diameter: 5.0, thickness: 0.25, tessellation: 64 }, scene);
  const mat = new B.StandardMaterial('ringMat', scene);
  mat.emissiveColor = new B.Color3(0.4, 0.9, 1.0);
  mat.specularColor = new B.Color3(0,0,0);
  base.material = mat;

  const COUNT = 60;
  const SPACING = 2.2;
  const rings = [];
  for (let i=0;i<COUNT;i++){
    const inst = base.createInstance('ring'+i);
    inst.rotation.x = Math.PI/2;
    inst.position.z = -i * SPACING;
    rings.push(inst);
  }
  base.setEnabled(false); // keep template hidden

  // Camera starts at z=0 and moves forward, loop rings to feel infinite
  const cam = scene.cameras.find(c => c.name === 'cam');
  if (cam) {
    cam.target = new B.Vector3(0,0,-10);
    cam.radius = 10;
    cam.alpha = Math.PI/2;
    cam.beta  = Math.PI/2;
  }

  let zOffset = 0;

  return (bands) => {
    const energy  = Math.max(0, Math.min(1, bands?.energy ?? 0));
    const bass    = Math.max(0, Math.min(1, bands?.bass?.avg ?? 0));
    const treble  = Math.max(0, Math.min(1, bands?.treble?.avg ?? 0));
    const centroid= Math.max(0, Math.min(1, bands?.centroid ?? 0));
    const beat    = Math.max(0, Math.min(1, bands?.beatPulse ?? 0));

    // Speed scales with bass/energy
    const speed = 0.12 + 1.25*(0.6*bass + 0.4*energy);
    zOffset += speed;

    // Animate rings and loop them behind camera
    for (let i=0;i<COUNT;i++){
      const inst = rings[i];
      // Loop: when ring passes camera, move it behind
      let z = -i*SPACING + (zOffset % (COUNT*SPACING));
      if (z > SPACING) z -= COUNT*SPACING;
      inst.position.z = z;

      // Reactive rotation and scale
      inst.rotation.z = 0.5 * Math.sin(0.3*z + 0.4*zOffset) + 1.8*centroid;
      const s = 1.0 + 0.25*Math.sin(0.2*z + 0.6*zOffset) + 0.35*bass + 0.15*beat;
      inst.scaling.set(s, s, s);
    }

    // Neon color drift with centroid/treble; beat adds a quick pop
    const hue = 0.55 + 0.25*centroid + 0.1*Math.sin(zOffset*0.05);
    const r = Math.abs(Math.sin(hue*3.14));
    const g = Math.abs(Math.sin(hue*5.21));
    const b = Math.abs(Math.sin(hue*7.77));
    mat.emissiveColor.set(r*(0.6+0.4*treble+0.2*beat), g*(0.6+0.4*treble+0.2*beat), b*(0.6+0.4*treble+0.2*beat));

    glow.intensity = 0.45 + 0.35*energy + 0.2*beat;
  };
}