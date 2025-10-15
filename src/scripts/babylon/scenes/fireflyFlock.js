// Firefly Flock — GPU particles if available, CPU fallback otherwise.
// Reactivity:
//  - energy → emission rate & radius
//  - treble (and zcr) → flicker
//  - beat → bloom pulse-like boost on lifespan and size envelope

export function buildFireflyFlock(scene) {
  const B = window.BABYLON;

  // Invisible sphere as logical emitter
  const emitter = B.MeshBuilder.CreateSphere('emitter', { diameter: 0.1 }, scene);
  emitter.isVisible = false;

  const supportsGPU = !!B.GPUParticleSystem && B.GPUParticleSystem.IsSupported;
  const capacity = supportsGPU ? 80000 : 8000;

  const ps = supportsGPU
    ? new B.GPUParticleSystem('fireflies', { capacity }, scene)
    : new B.ParticleSystem('fireflies', capacity, scene);

  // Small round white texture (data URI)
  const dot = new Image();
  const tex = new B.Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAALklEQVQoU2NkwA7+//8zMDAwQKZgGJwYQyYGE4QwDA0MIE0Qg4kCwzA0gKQEgA2bQGvKk7cNwAAAABJRU5ErkJggg==', scene, true, false, B.Texture.BILINEAR_SAMPLINGMODE);
  ps.particleTexture = tex;

  ps.emitter = emitter;
  ps.minEmitBox = new B.Vector3(-0.1, -0.1, -0.1);
  ps.maxEmitBox = new B.Vector3(0.1, 0.1, 0.1);

  ps.minSize = 0.02; ps.maxSize = 0.06;
  ps.minLifeTime = 1.5; ps.maxLifeTime = 3.5;
  ps.emitRate = 6000;
  ps.blendMode = B.ParticleSystem.BLENDMODE_ADD;

  ps.direction1 = new B.Vector3(-1, 1, 0.5);
  ps.direction2 = new B.Vector3(1, -1, -0.5);

  ps.minAngularSpeed = -0.2;
  ps.maxAngularSpeed = 0.2;

  ps.color1 = new B.Color4(1.0, 0.95, 0.8, 1.0);
  ps.color2 = new B.Color4(0.7, 0.9, 1.0, 1.0);
  ps.colorDead = new B.Color4(0, 0, 0, 0);

  ps.gravity = new B.Vector3(0, 0, 0);

  ps.start();

  // Gentle curl motion field using Animations on emitter
  const t = { theta: 0 };
  scene.onBeforeRenderObservable.add(() => {
    t.theta += scene.getEngine().getDeltaTime() * 0.0002;
    const r = 1.2;
    emitter.position.x = r * Math.cos(t.theta * 0.9);
    emitter.position.y = 0.4 * Math.sin(t.theta * 1.1);
    emitter.position.z = r * Math.sin(t.theta * 0.7);
  });

  // A dim environment light animation for subtle pulsing
  const hemi = scene.lights.find(l => l.name === 'hemi') || null;

  // Return updater
  return (bands) => {
    const energy = Math.max(0, Math.min(1, bands?.energy ?? 0));
    const treble = Math.max(0, Math.min(1, bands?.treble?.avg ?? 0));
    const zcr = Math.max(0, Math.min(1, bands?.zcr ?? 0));
    const beat = Math.max(0, Math.min(1, bands?.beatPulse ?? 0));

    // Emission and radius scale with energy
    ps.emitRate = (supportsGPU ? 20000 : 3000) * (0.35 + 0.9 * energy);
    const radius = 1.5 + 1.2 * energy;
    emitter.scaling.set(radius, radius * 0.7, radius);

    // Flicker with treble/zcr
    const flicker = 0.8 + 0.6 * (0.6 * treble + 0.4 * zcr);
    ps.minSize = 0.018 * flicker;
    ps.maxSize = 0.065 * flicker;

    // Beat pulse: momentary lifespan and brightness lift
    const beatBoost = 1.0 + 0.6 * beat;
    ps.minLifeTime = 1.3 * (2.0 - beatBoost);
    ps.maxLifeTime = 3.3 * (2.0 - beatBoost);

    if (hemi) hemi.intensity = 0.6 + 0.3 * energy + 0.15 * beat;
  };
}