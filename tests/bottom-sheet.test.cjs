const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  const slots = [], pending = new Map(), animations = [];
  let cursor, dirty, reduced = false;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], next => { slots[index] = next; dirty = true; }];
    },
    useEffect(callback, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) pending.set(index, { callback, deps });
    },
  };
  const native = {
    Modal: 'Modal', View: 'View', Pressable: 'Pressable',
    StyleSheet: { create: value => value, absoluteFill: { position: 'absolute', inset: 0 } },
    useWindowDimensions: () => ({ height: 800 }),
    Easing: { cubic: 'cubic', out: value => value, in: value => value },
    Animated: {
      View: 'AnimatedView',
      Value: class { constructor(value) { this.value = value; } interpolate(config) { return { config }; } },
      timing(value, config) {
        const animation = { config, start: callback => { animation.finish = callback; }, stop: () => animation.finish?.({ finished: false }) };
        animations.push(animation);
        return animation;
      },
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(require.resolve('../src/components/ui.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports: module.exports, module,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react-native') return native;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === '../hooks/use-app-theme') return { useThemeStyles: styles => styles };
      if (name === '../hooks/use-reduced-motion') return { useReducedMotion: () => reduced };
      if (name === '../constants/theme') return { colors: {}, fonts: {} };
      if (name === 'lucide-react-native' || name === 'expo-linear-gradient') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return {
    animations,
    reduceMotion: () => { reduced = true; },
    render(visible) {
      let tree;
      do {
        dirty = false; cursor = 0;
        tree = module.exports.BottomSheet({ visible, onClose() {}, title: 'Test', children: 'Content' });
      } while (dirty);
      for (const [index, effect] of pending) {
        slots[index]?.cleanup?.();
        slots[index] = { deps: effect.deps, cleanup: effect.callback() };
      }
      pending.clear();
      return tree;
    },
  };
}

test('overlay only fades; only the sheet translates and the native modal has no movement', () => {
  const h = harness();
  const tree = h.render(true);
  assert.equal(tree.props.animationType, 'none');
  const [overlay, sheet] = tree.props.children.props.children;
  assert.ok(overlay.props.style[1].opacity);
  assert.equal(overlay.props.style[1].transform, undefined);
  assert.ok(sheet.props.style[1].transform[0].translateY);
});

test('closing keeps the modal mounted through exit; reopening cancels a stale close callback', () => {
  const h = harness();
  h.render(true);
  assert.equal(h.render(false).props.visible, true);
  const closing = h.animations.at(-1);
  assert.equal(closing.config.toValue, 0);
  h.render(true);
  closing.finish({ finished: true });
  assert.equal(h.render(true).props.visible, true);
  h.render(false);
  h.animations.at(-1).finish({ finished: true });
  assert.equal(h.render(false).props.visible, false);
});

test('reduced-motion uses immediate opening and closing', () => {
  const h = harness();
  h.reduceMotion();
  h.render(true);
  assert.equal(h.animations.at(-1).config.duration, 0);
  h.render(false);
  assert.equal(h.animations.at(-1).config.duration, 0);
});
