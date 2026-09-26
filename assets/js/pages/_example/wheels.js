// Example demo for src/pages/_example.mjs: the rover's four wheels turn on a slider.
// The same pattern (load the GLB, find the moving part, pivot it about its real axis, drive
// the angle from a control) is the template for every mechanism demo.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout } from '/assets/js/lib/ui.js';

export async function mount(el, ctx) {
  const stage = createStage(el);
  const rover = await stage.load('/assets/models/rover.glb');
  stage.frame(rover, { azimuth: 125, elevation: 20 });

  // The wheels are separate parts in the CAD ("Wheels v7"). Each is round about its axle, which
  // runs along the model's Z axis, so its bounding-box centre lies on the axle (the same rig as
  // the landing scene). For anything not round about its axis, take the axis from tools/cad-axes.py.
  const parts = stage.part(/Wheels/);
  const wheels = parts.map((w) => stage.pivot(w, 'center', [0, 0, 1]));
  const size = stage.bounds(parts[0]).box.getSize(new stage.THREE.Vector3());
  const radius = Math.max(size.x, size.y) / 2; // metres, measured from the CAD

  const info = readout(null, { rows: [
    { key: 'deg', label: 'Wheel angle', unit: '°', format: (v) => v.toFixed(0) },
    { key: 'cm', label: 'Distance rolled', unit: 'cm', format: (v) => v.toFixed(1) },
    { key: 'r', label: 'Wheel radius (CAD)', unit: 'mm', format: (v) => v.toFixed(1) },
  ] });
  const set = (deg) => {
    const a = (deg * Math.PI) / 180;
    for (const w of wheels) w.setAngle(a); // positive about +Z: the tops move toward -X, so it rolls toward -X
    info.set({ deg, cm: a * radius * 100, r: radius * 1000 });
  };
  const s = slider(ctx.panel, { label: 'Turn the wheels', min: 0, max: 720, step: 1, value: 0, unit: '°', format: (v) => v.toFixed(0), onInput: set });

  // Play spins them continuously; nothing moves on its own (and never with reduced motion)
  let stop = null;
  playToggle(ctx.panel, {
    playing: false,
    onChange(on) {
      stop?.(); stop = null;
      if (on) stop = stage.onFrame((dt) => s.set((s.value + dt * 120) % 720));
    },
  });
  ctx.panel.append(info.el);
  set(0);
  return { dispose() { stop?.(); stage.dispose(); } };
}
