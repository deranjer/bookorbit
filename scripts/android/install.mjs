#!/usr/bin/env node
// Build and install the BookOrbit Android debug build onto a running
// device/emulator. See emulator.mjs for why this is Node and not bash.
//
// Usage: pnpm run android:install
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ANDROID_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'android');
const IS_WIN = process.platform === 'win32';

const cmd = IS_WIN ? 'gradlew.bat' : './gradlew';
const res = spawnSync(cmd, [':app:installDebug'], {
  cwd: ANDROID_DIR,
  stdio: 'inherit',
  shell: IS_WIN, // run the .bat through cmd.exe
});
process.exit(res.status ?? 1);
