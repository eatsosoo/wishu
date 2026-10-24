const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function mount({ reduced = false, initialState = 'active' } = {}) {
  let effect, listener, removed = false, starts = 0, stops = 0, value;
  const appState = { currentState: initialState, addEventListener: (_event, callback) => { listener = callback; return { remove: () => { removed = true; } }; } };
  const native = {
    View: 'View', Text: 'Text', StyleSheet: { create: styles => styles }, AppState: appState, Easing: { linear: 'linear' },
    Animated: {
      View: 'AnimatedView', Value: class { constructor(initial) { value = initial; } setValue(next) { value = next; } interpolate() { return 0; } },
      timing: (_value, config) => { assert.equal(config.useNativeDriver, true); assert.equal(config.isInteraction, false); return {}; },
      loop: () => ({ start() { starts++; }, stop() { stops++; } }),
    },
  };
  const jsx = (type, props) => ({ type, props });
  function load(file) {
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(require.resolve(file), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (name === 'react') return { useState: init => [init()], useEffect: callback => { effect = callback; }, useId: () => 'duck' };
    if (name === 'react-native') return native;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react-native-svg') return {};
    if (name === '../constants/theme') return { fonts: {} };
    if (name.endsWith('/use-reduced-motion')) return { useReducedMotion: () => reduced };
    if (name === '../hooks/use-loading-motion') return load('../src/hooks/use-loading-motion.ts');
    throw new Error(name);
  } });
    return module.exports;
  }
  const tree = load('../src/components/WalkingDuck.tsx').WalkingDuck({ colors: {} });
  const cleanup = effect();
  return { tree, state: () => ({ starts, stops, removed, value }), cleanup: () => cleanup?.(),
    background: () => { appState.currentState = 'background'; listener?.(); }, foreground: () => { appState.currentState = 'active'; listener?.(); } };
}
test('loading pauses in the background, resumes in foreground and releases the loop on unmount', () => {
  const h = mount();
  assert.equal(h.state().starts, 1);
  h.background(); assert.equal(h.state().starts, 1);
  const stopped = h.state().stops;
  h.foreground(); assert.equal(h.state().starts, 2);
  h.cleanup(); assert.equal(h.state().removed, true); assert.ok(h.state().stops > stopped);
});
test('Reduce Motion keeps a static, accessible loading mark without scheduling an animation', () => {
  const h = mount({ reduced: true });
  assert.equal(h.state().starts, 0);
  assert.equal(h.state().value, 0);
  assert.equal(h.tree.props.accessibilityRole, 'progressbar');
  assert.equal(h.tree.props['aria-busy'], true);
  h.cleanup();
});
