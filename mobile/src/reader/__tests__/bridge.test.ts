import { jsBegin, jsChunk, jsCommand, jsCommit, parseReaderEvent, type OpenMeta } from '../bridge';
import type { ReaderSettings } from '../settings';

const settings = { fontSize: 16, themeName: 'sepia', flow: 'paginated' } as unknown as ReaderSettings;

describe('parseReaderEvent', () => {
  it('parses a well-formed event', () => {
    const event = parseReaderEvent(JSON.stringify({ type: 'relocate', cfi: 'x', fraction: 0.5 }));
    expect(event).toMatchObject({ type: 'relocate', cfi: 'x', fraction: 0.5 });
  });

  it('returns null for non-JSON', () => {
    expect(parseReaderEvent('not json')).toBeNull();
  });

  it('returns null when there is no type field', () => {
    expect(parseReaderEvent(JSON.stringify({ cfi: 'x' }))).toBeNull();
  });
});

describe('command builders', () => {
  it('jsChunk embeds the base64 verbatim in a string literal', () => {
    expect(jsChunk('AAaa00+/==')).toBe('window.__readerChunk && window.__readerChunk("AAaa00+/==");true;');
  });

  it('jsCommit is a guarded call', () => {
    expect(jsCommit()).toBe('window.__readerCommit && window.__readerCommit();true;');
  });

  it('jsBegin double-encodes the meta so it arrives as a JSON string arg', () => {
    const meta: OpenMeta = { format: 'epub', cfi: null, fraction: 0.25, settings };
    const js = jsBegin(meta);
    // The injected argument must be a JS string literal whose contents are JSON.
    const arg = js.match(/__readerBegin\((".*")\);true;$/)?.[1];
    expect(arg).toBeDefined();
    const inner = JSON.parse(arg!) as string; // unwrap the JS string literal
    expect(JSON.parse(inner)).toEqual(meta);
  });

  it('jsCommand double-encodes the command', () => {
    const js = jsCommand({ type: 'goTo', target: 'epubcfi(/6/4)' });
    const arg = js.match(/__readerCommand\((".*")\);true;$/)?.[1];
    const inner = JSON.parse(arg!) as string;
    expect(JSON.parse(inner)).toEqual({ type: 'goTo', target: 'epubcfi(/6/4)' });
  });
});
