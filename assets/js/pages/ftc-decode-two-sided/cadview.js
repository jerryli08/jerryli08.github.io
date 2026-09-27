// The whole concept CAD, orbitable. The front and back outer plates and the two side walls can be
// taken off to see in (they start off).
import { createStage } from '/assets/js/lib/stage.js';
import { segmented } from '/assets/js/lib/ui.js';
import { loadRobot, fade } from './rig.js';

export async function mount(el, ctx) {
  const stage = createStage(el, { fov: 30, exposure: 1.2 });
  const { P } = await loadRobot(stage);
  const outer = [P.shell, P.walls];
  fade(outer, 0);
  stage.frame(null, { azimuth: 38, elevation: 20, pad: 0.96 });
  segmented(ctx.panel, { label: 'Outer plates and side walls', value: 'off',
    options: [{ value: 'off', label: 'Off, to see in' }, { value: 'on', label: 'On' }],
    onChange: (v) => fade(outer, v === 'on' ? 1 : 0) });
  return { dispose: () => stage.dispose() };
}
