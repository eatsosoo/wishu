const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('hidden camera releases previews and flash, preserves shots and waits for redisplay on return', async () => {
  const slots = [];
  let cursor = 0, focus, appStateChange, stops = 0, permissionRefreshes = 0;
  const jsx = (type, props) => ({ type, props });
  const ui = Object.fromEntries(['Body', 'IconButton', 'PrimaryButton', 'SecondaryButton'].map(name => [name, name]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef(current) { const index = cursor++; return slots[index] ??= { current }; },
    useCallback: fn => fn,
    useEffect: fn => { fn(); },
  };
  const native = {
    View: 'View', ScrollView: 'ScrollView', Pressable: 'Pressable', Platform: { OS: 'ios' },
    StyleSheet: { create: value => value, absoluteFill: {} },
    AppState: { currentState: 'active', addEventListener: (_event, fn) => { appStateChange = fn; return { remove() {} }; } },
    Animated: { View: 'AnimatedView', Value: class { stopAnimation() { stops++; } setValue() {} }, timing: () => ({ start() {}, stop() {} }) },
  };
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(require.resolve('../src/components/CheckInCamera.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react-native') return native;
    if (name === 'expo-router') return { useFocusEffect: fn => { focus = fn; } };
    if (name === 'expo-camera') return { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, async () => {}, async () => { permissionRefreshes++; }] };
    if (name === 'expo-image-picker') return { launchImageLibraryAsync: async () => ({ assets: [{ uri: 'file:///picked.jpg', width: 1600, height: 1600 }] }) };
    if (name === './ui') return ui;
    if (name === './TemplatePhoto') return { TemplatePhoto: 'TemplatePhoto' };
    if (name.endsWith('/use-app-theme')) return { useAppTheme: () => ({ colors: {} }) };
    if (name.endsWith('/use-button-state')) return { useButtonState: () => ({ inactive: {} }) };
    if (name.endsWith('/square-crop')) return { centeredSquare: {} };
    if (name.endsWith('/templates')) return { checkInTemplates: [{ id: 'single', cells: [{ x: 0, y: 0, width: 1, height: 1 }] }] };
    if (name.endsWith('/optimize-photo')) return { optimizePickedPhoto: async () => ({ uri: 'file:///optimized.jpg' }) };
    if (name.endsWith('/limits')) return { photoResize: () => null };
    return {};
  } });
  const render = () => { cursor = 0; return module.exports.CheckInCamera({ editingPhoto: false, onConfirm() {}, onPhotoInteractionChange() {} }); };
  function nodes(node, type) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(child => nodes(child, type));
    return [...(node.type === type ? [node] : []), ...nodes(node.props?.children, type)];
  }
  render();
  const blur = focus();
  const tree = render();
  assert.equal(nodes(tree, 'CameraView').length, 1);
  nodes(tree, 'IconButton').find(node => node.props.label === 'Chọn ảnh từ thư viện').props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  let photo = nodes(render(), 'TemplatePhoto')[0];
  photo.props.onLoad();
  assert.equal(nodes(render(), 'PrimaryButton')[0].props.disabled, false);
  blur();
  const hidden = render();
  assert.equal(nodes(hidden, 'CameraView').length, 0);
  assert.equal(nodes(hidden, 'TemplatePhoto').length, 0);
  assert.ok(stops > 0, 'Blur stops the native flash animation');
  appStateChange('active');
  assert.equal(permissionRefreshes, 0, 'An inactive editor must not refresh camera permission');
  focus();
  const returned = render();
  photo = nodes(returned, 'TemplatePhoto')[0];
  assert.equal(photo.props.source.uri, 'file:///optimized.jpg');
  assert.equal(nodes(returned, 'PrimaryButton')[0].props.disabled, true, 'Wait for the preview to load before recapturing');
  photo.props.onLoad();
  assert.equal(nodes(render(), 'PrimaryButton')[0].props.disabled, false);
});
