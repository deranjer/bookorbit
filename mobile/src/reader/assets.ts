import { Asset } from 'expo-asset';
import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';

/**
 * Foliate.js + the host page are shipped as static `.txt` assets (Metro treats `.js`
 * as source, so the suffix keeps them out of the module graph). At first launch we
 * copy the whole tree into a writable directory under documentDirectory, stripping the
 * `.txt`, so the WebView can load `index.html` and resolve foliate's relative module
 * imports from the same file:// origin as the book file it later reads.
 *
 * Bump READER_ASSET_VERSION whenever the contents of assets/reader change so existing
 * installs re-copy instead of serving a stale reader.
 */
const READER_ASSET_VERSION = 1;

interface ReaderAsset {
  module: number;
  /** Path relative to the reader root, with the `.txt` suffix removed. */
  target: string;
}

// Static requires so Metro bundles each file. Targets mirror the web client's
// public/assets/foliate layout, plus our host page + bridge.
/* eslint-disable @typescript-eslint/no-require-imports -- Metro only bundles assets referenced by a static require(); import() would not register them. */
const ASSETS: ReaderAsset[] = [
  { module: require('../../assets/reader/index.html.txt'), target: 'index.html' },
  { module: require('../../assets/reader/bridge.js.txt'), target: 'bridge.js' },
  { module: require('../../assets/reader/foliate/comic-book.js.txt'), target: 'foliate/comic-book.js' },
  { module: require('../../assets/reader/foliate/dict.js.txt'), target: 'foliate/dict.js' },
  { module: require('../../assets/reader/foliate/epub.js.txt'), target: 'foliate/epub.js' },
  { module: require('../../assets/reader/foliate/epubcfi.js.txt'), target: 'foliate/epubcfi.js' },
  { module: require('../../assets/reader/foliate/fb2.js.txt'), target: 'foliate/fb2.js' },
  { module: require('../../assets/reader/foliate/fixed-layout.js.txt'), target: 'foliate/fixed-layout.js' },
  { module: require('../../assets/reader/foliate/mobi.js.txt'), target: 'foliate/mobi.js' },
  { module: require('../../assets/reader/foliate/overlayer.js.txt'), target: 'foliate/overlayer.js' },
  { module: require('../../assets/reader/foliate/paginator.js.txt'), target: 'foliate/paginator.js' },
  { module: require('../../assets/reader/foliate/progress.js.txt'), target: 'foliate/progress.js' },
  { module: require('../../assets/reader/foliate/search.js.txt'), target: 'foliate/search.js' },
  { module: require('../../assets/reader/foliate/streaming-loader.js.txt'), target: 'foliate/streaming-loader.js' },
  { module: require('../../assets/reader/foliate/text-walker.js.txt'), target: 'foliate/text-walker.js' },
  { module: require('../../assets/reader/foliate/tts.js.txt'), target: 'foliate/tts.js' },
  { module: require('../../assets/reader/foliate/view.js.txt'), target: 'foliate/view.js' },
  { module: require('../../assets/reader/foliate/vendor/fflate.js.txt'), target: 'foliate/vendor/fflate.js' },
  { module: require('../../assets/reader/foliate/vendor/zip.js.txt'), target: 'foliate/vendor/zip.js' },
];
/* eslint-enable @typescript-eslint/no-require-imports */

function readerRoot(): string {
  return `${documentDirectory}reader/`;
}

function versionPath(): string {
  return `${readerRoot()}.version`;
}

function indexHtmlUri(): string {
  return `${readerRoot()}index.html`;
}

async function ensureDir(uri: string): Promise<void> {
  const info = await getInfoAsync(uri);
  if (!info.exists) await makeDirectoryAsync(uri, { intermediates: true });
}

async function isCurrent(): Promise<boolean> {
  try {
    const index = await getInfoAsync(indexHtmlUri());
    if (!index.exists) return false;
    const version = await readAsStringAsync(versionPath());
    return version === String(READER_ASSET_VERSION);
  } catch {
    return false;
  }
}

async function copyAll(): Promise<void> {
  // Wipe any previous (possibly older-version) copy so we never mix asset versions.
  await deleteAsync(readerRoot(), { idempotent: true });
  await ensureDir(readerRoot());
  await ensureDir(`${readerRoot()}foliate/`);
  await ensureDir(`${readerRoot()}foliate/vendor/`);

  for (const entry of ASSETS) {
    const asset = Asset.fromModule(entry.module);
    await asset.downloadAsync();
    const from = asset.localUri ?? asset.uri;
    if (!from) throw new Error(`Reader asset unavailable: ${entry.target}`);
    await copyAsync({ from, to: `${readerRoot()}${entry.target}` });
  }

  await writeAsStringAsync(versionPath(), String(READER_ASSET_VERSION));
}

let prepared: Promise<string> | null = null;

/**
 * Copy the reader assets to disk (once per app run / version) and resolve the
 * file:// URI of the host page to load in the WebView.
 */
export function ensureReaderAssets(): Promise<string> {
  if (!prepared) {
    prepared = (async () => {
      if (!(await isCurrent())) await copyAll();
      return indexHtmlUri();
    })().catch((e) => {
      prepared = null; // allow a retry on the next open
      throw e;
    });
  }
  return prepared;
}

/** Root directory the WebView is granted read access to (covers reader + book files). */
export function readerReadAccessRoot(): string {
  return documentDirectory ?? readerRoot();
}
