const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const { StackRouter } = require(path.join(path.dirname(require.resolve('expo-router/package.json')), 'build/react-navigation/routers/StackRouter.js'));

function harness(platform, success = true) {
  const events = [];
  const effects = [];
  const draft = { id: 'saved-checkin', photo: { uri: 'file:///collage.jpg' }, point: { latitude: 11.94, longitude: 108.44 }, title: 'Đà Lạt', note: '', companion: '', date: '24/10/2026' };
  const state = { draft, routes: [{ key: 'photo', name: 'new' }, { key: 'editor', name: 'details' }, { key: 'preloaded-photo', name: 'new', isPreloaded: true }] };
  let navigationState = { stale: false, type: 'stack', key: 'check-in-stack', routeNames: ['new', 'details', '[id]'], routeKeySeq: 3, index: 1, routes: state.routes };
  const stackRouter = StackRouter({});
  const ui = Object.fromEntries(['Body', 'AppInput', 'AppTextarea', 'IconButton', 'PrimaryButton', 'SecondaryButton', 'Heading', 'BottomSheet', 'EmptyState'].map(name => [name, name]));
  function load(file, editor = false) {
    const module = { exports: {} };
    const output = ts.transpileModule(fs.readFileSync(require.resolve(file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(output + (editor ? '\nexports.editor = DetailsEditor;' : ''), {
      module, exports: module.exports, process: { env: {} },
      require(name) {
        if (name === 'react') return {
          useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
          useRef: current => ({ current }), useMemo: fn => fn(), useCallback: fn => fn,
          useEffect: effect => effects.push(effect),
        };
        if (name === 'react-native') return { Platform: { OS: platform }, View: 'View', Pressable: 'Pressable', StyleSheet: { absoluteFill: {} } };
        if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
        if (name === 'expo-router') return {
          router: { replace: route => events.push(['replace', route]) }, useFocusEffect() {},
          useNavigation: () => ({
            getState: () => navigationState,
            reset: next => {
              const result = stackRouter.getStateForAction(navigationState, { type: 'RESET', payload: next }, {});
              assert.ok(result && typeof result === 'object' && result.state, 'The installed Expo Router must handle the reset');
              events.push(['reset', next]); navigationState = result.state; state.routes = result.state.routes;
            },
          }),
          useLocalSearchParams: () => ({ id: draft.id, saved: 'yes' }),
        };
        if (name.endsWith('/use-wish-store')) return { useWishStore: () => ({ actor: 'minh', checkIns: [{ ...draft, ...draft.point, createdBy: 'minh', visitedAt: '2026-10-24' }], saveCheckIn: async input => { events.push(['save', input]); return success; } }) };
        if (name.endsWith('/use-app-theme')) return { useAppTheme: () => ({ colors: {} }) };
        if (name.endsWith('/check-in/draft')) return { localToday: () => '2026-10-24', useCheckInDraft: () => ({ setDraft: update => { state.draft = update(state.draft); } }) };
        if (name.endsWith('/wishes/format')) return { parseDate: () => '2026-10-24', formatDate: value => value };
        if (name.endsWith('/ui')) return ui;
        if (name.endsWith('/AppScreen')) return { AppScreen: 'AppScreen' };
        if (name === 'expo-location' || name === 'expo-linking' || name === 'lucide-react-native') return {};
        return {};
      },
    });
    return module.exports;
  }
  function find(node, type) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const child of node) { const found = find(child, type); if (found) return found; } return; }
    return node.type === type ? node : find(node.props?.children, type);
  }
  return {
    state, events,
    save: () => find(load('../src/app/check-in/details.tsx', true).editor({ draft }), 'PrimaryButton').props.onPress(),
    openSaved: () => { effects.length = 0; load('../src/app/check-in/[id].tsx').default(); effects.forEach(effect => effect()); },
  };
}

test('successful native save removes every camera/editor route and clears the matching draft on arrival', async () => {
  for (const platform of ['ios', 'android']) {
    const h = harness(platform);
    await h.save();
    assert.deepEqual(JSON.parse(JSON.stringify(h.state.routes.map(({ name, params }) => ({ name, params })))), [{ name: '[id]', params: { id: 'saved-checkin', saved: 'yes' } }]);
    const reset = h.events.find(event => event[0] === 'reset')[1];
    assert.equal(reset.key, 'check-in-stack');
    assert.equal(reset.stale, false);
    assert.equal(reset.index, 0);
    assert.equal(reset.routeKeySeq, 4);
    assert.equal(reset.routes[0].isPreloaded, undefined);
    const firstKey = h.state.routes[0].key;
    await h.save();
    assert.notEqual(h.state.routes[0].key, firstKey, 'Saving an edited check-in must remount its detail screen so draft cleanup runs again');
    assert.ok(h.state.draft, 'Keep the draft until navigation has completed');
    h.openSaved();
    assert.equal(h.state.draft, null);
  }
});

test('failed native saves preserve the editor stack and photo for retry', async () => {
  const h = harness('ios', false);
  await h.save();
  assert.deepEqual(h.state.routes.map(route => route.name), ['new', 'details', 'new']);
  assert.equal(h.state.draft.photo.uri, 'file:///collage.jpg');
  assert.deepEqual(h.events.map(event => event[0]), ['save']);
});

test('web saves retain the existing replace navigation and an unrelated draft is never cleared', async () => {
  const h = harness('web');
  await h.save();
  assert.deepEqual(h.events.map(event => event[0]), ['save', 'replace']);
  h.state.draft = { id: 'another-checkin', photo: { uri: 'file:///new-draft.jpg' } };
  h.openSaved();
  assert.equal(h.state.draft.id, 'another-checkin');
});
