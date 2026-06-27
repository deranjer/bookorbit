#!/usr/bin/env node
// Build, install, and launch the BookOrbit Android app on a running emulator
// (or boot the first available AVD if none is running).
//
// Usage: pnpm run android:emulator [avdName]
//
// Written in Node (not bash) on purpose: npm's default script shell on Windows
// resolves `bash` to the WSL launcher, which can't see the Windows SDK paths.
// Node sidesteps the shell-ambiguity and CRLF-gradlew issues entirely.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ANDROID_DIR = join(ROOT, 'android');
const IS_WIN = process.platform === 'win32';
const EXE = IS_WIN ? '.exe' : '';

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

// Resolve the Android SDK: env var first, else sdk.dir from android/local.properties.
function resolveSdk() {
  const fromEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (fromEnv) return fromEnv;
  const lp = join(ANDROID_DIR, 'local.properties');
  if (existsSync(lp)) {
    const m = readFileSync(lp, 'utf8').match(/^sdk\.dir=(.+)$/m);
    if (m) return m[1].trim().replace(/\\\\/g, '\\').replace(/\\:/g, ':');
  }
  fail('could not resolve Android SDK (set ANDROID_HOME or sdk.dir in android/local.properties)');
}

const SDK = resolveSdk();
const ADB = join(SDK, 'platform-tools', `adb${EXE}`);
const EMULATOR = join(SDK, 'emulator', `emulator${EXE}`);
if (!existsSync(ADB)) fail(`adb not found at ${ADB}`);

const adb = (args, opts = {}) => spawnSync(ADB, args, { encoding: 'utf8', ...opts });

function hasDevice() {
  const out = adb(['devices']).stdout || '';
  // Lines look like "emulator-5554\tdevice"; ignore the header and offline/unauthorized states.
  return out.split('\n').slice(1).some((l) => /\bdevice\s*$/.test(l.trim()));
}

async function bootEmulator() {
  if (!existsSync(EMULATOR)) fail(`emulator not found at ${EMULATOR}`);
  const requested = process.argv[2];
  const avds = (spawnSync(EMULATOR, ['-list-avds'], { encoding: 'utf8' }).stdout || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (avds.length === 0) {
    fail('no running device and no AVD found — create one in Android Studio\'s Device Manager');
  }
  const avd = requested || avds[0];
  if (requested && !avds.includes(requested)) {
    fail(`AVD "${requested}" not found. Available: ${avds.join(', ')}`);
  }
  console.log(`Booting emulator: ${avd}`);
  const child = spawn(EMULATOR, ['-avd', avd, '-netdelay', 'none', '-netspeed', 'full'], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  console.log('Waiting for device...');
  adb(['wait-for-device'], { stdio: 'inherit' });
  // Block until boot finishes so install/launch don't race the boot animation.
  for (;;) {
    const booted = (adb(['shell', 'getprop', 'sys.boot_completed']).stdout || '').trim();
    if (booted === '1') break;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

function gradleInstall() {
  console.log('Installing debug build...');
  // gradlew.bat is the native Windows wrapper; the POSIX `gradlew` has CRLF
  // endings that some shells can't exec, so always prefer the .bat on Windows.
  const cmd = IS_WIN ? 'gradlew.bat' : './gradlew';
  const res = spawnSync(cmd, [':app:installDebug'], {
    cwd: ANDROID_DIR,
    stdio: 'inherit',
    shell: IS_WIN, // run the .bat through cmd.exe
  });
  if (res.status !== 0) fail('gradle install failed');
}

function launch() {
  console.log('Launching com.bookorbit.debug ...');
  adb(['shell', 'am', 'start', '-n', 'com.bookorbit.debug/com.bookorbit.app.MainActivity'], {
    stdio: 'inherit',
  });
}

if (!hasDevice()) await bootEmulator();
gradleInstall();
launch();
console.log('Done.');
