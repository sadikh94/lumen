import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

function recentActions() {
  const text = readFileSync('src/screen/RecentScreen/RecentScreen.container.tsx', 'utf8');
  const source = ts.createSourceFile('Recent.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let object: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source).includes('mutate: continueWatching')
      && node.initializer && ts.isCallExpression(node.initializer)) object = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(object);
  const base = { link: 'zona', voices: [], hasSeasons: false };
  const film = { ...base, metadataSourceFilm: { voices: [{ id: '7' }] } };
  const voice = { id: 'rezka:7' };
  const calls: string[] = [];
  const context: any = {
    sourceRouter: { loadFilm: async () => base, resolvePreferredFilm: async () => film },
    currentService: {}, isLocalLibrary: false, localHistory: [],
    getSavedTime: () => ({ lastVoiceId: voice.id, voices: { [voice.id]: {} } }),
    sourcePlaybackRouter: { getAdapterForFilmLink: () => ({
      getFilmVoices: async (value: typeof film) => {
        assert.equal(value.metadataSourceFilm, film.metadataSourceFilm);

        return [voice];
      },
      getFilmStreamsByVoice: async () => ({ streams: [{ url: 'video' }] }),
    }) },
    openFilm: () => calls.push('details'), navigation: {},
    RouterStore: { pushData: () => calls.push('player-data') }, navigate: () => calls.push('player'),
    PLAYER_SCREEN: 'player', t: (value: string) => value,
  };
  runInNewContext(ts.transpileModule(`globalThis.actions = ${ object.getText(source)}`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);

  return { ...context.actions, calls };
}

test('Recent play loads the same supplemental voice metadata as the content page', async () => {
  const actions = recentActions();
  const result = await actions.mutationFn({ link: 'zona' });
  assert.equal(result.voice.id, 'rezka:7');
  assert.equal(result.video.streams[0].url, 'video');
  actions.onSuccess(result, {});
  assert.deepEqual(actions.calls, ['player-data', 'player']);
});

test('Recent never opens an empty player and retains access to the continuation page on failure', () => {
  const actions = recentActions();
  actions.onSuccess({ film: { link: 'zona' }, video: { streams: [] } }, { image: '' });
  actions.onError(new Error('source failed'), { link: 'zona', image: '' });
  assert.deepEqual(actions.calls, ['details', 'details']);
});