// Many page builders share this 2-core machine. A browser with software WebGL takes a core and
// about 1 GB, so at most PW_SLOTS (default 3) of these tools run a browser at once; the rest wait.
import { openSync, closeSync, unlinkSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
const SLOTS = +(process.env.PW_SLOTS || 3);
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
export async function acquire() {
  for (;;) {
    for (let i = 0; i < SLOTS; i++) {
      const f = `/tmp/pw-slot-${i}`;
      // a slot left by a process that died is free again
      if (existsSync(f)) { const pid = +readFileSync(f, 'utf8'); if (pid && !alive(pid)) try { unlinkSync(f); } catch {} }
      try {
        const fd = openSync(f, 'wx'); writeFileSync(fd, String(process.pid)); closeSync(fd);
        const release = () => { try { unlinkSync(f); } catch {} };
        process.on('exit', release); process.on('SIGINT', () => process.exit(130)); process.on('SIGTERM', () => process.exit(143));
        return release;
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}
