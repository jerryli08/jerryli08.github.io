// Example scrolly for src/pages/_example.mjs: scrolling rolls the rover's four wheels, with a
// readout that follows. The same pattern (load the GLB, find the moving part, pivot it about its
// real axis, drive the angle from the scroll) is the template for every mechanism animation.
// Everything is a pure function of the scroll: no controls, nothing moves on its own.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false });
  const rover = await stage.load('/assets/models/rover.glb');
  const view = stage.frame(rover, { azimuth: 125, elevation: 20, apply: false }); // framed once, at rest

  // The wheels are separate parts in the CAD ("Wheels v7"). Each is round about its axle, which
  // runs along the model's Z axis, so its bounding-box centre lies on the axle (the same rig as
  // the landing scene). For anything not round about its axis, take the axis from tools/cad-axes.py.
  const parts = stage.part(/Wheels/);
  const wheels = parts.map((w) => stage.pivot(w, 'center', [0, 0, 1]));
  const size = stage.bounds(parts[0]).box.getSize(new stage.THREE.Vector3());
  const radius = Math.max(size.x, size.y) / 2; // metres, measured from the CAD

  // a small readout on the stage (site.css .rx-hud)
  const ov = labelLayer(stage);
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.innerHTML = '<div class="rx-hud-row"><span>Wheel angle</span><b class="num"></b></div><div class="rx-hud-row rx-hud-big"><span>Distance rolled</span><b class="num"></b></div><div class="rx-hud-row rx-hud-x"><span>Wheel radius (CAD)</span><b class="num"></b></div>';
  ov.layer.append(hud);
  const [deg, dist, rad] = hud.querySelectorAll('b');
  rad.textContent = `${(radius * 1000).toFixed(1)} mm`;

  function setProgress(p) {
    stage.setShift(...ctx.shift());
    stage.setView(view);
    const d = ctx.reducedMotion ? 0 : 720 * p; // two turns over the section
    const a = (d * Math.PI) / 180;
    for (const w of wheels) w.setAngle(a); // positive about +Z: the tops move toward -X, so it rolls toward -X
    deg.textContent = `${d.toFixed(0)}°`;
    dist.textContent = `${(a * radius * 100).toFixed(1)} cm`;
  }
  setProgress(0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
