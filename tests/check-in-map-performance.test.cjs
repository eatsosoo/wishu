const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const { mapDocument } = require('../src/features/check-in/map-document.ts');

function harness() {
  const calls = { data: 0, paint: 0, markers: 0, position: 0, offset: 0, removed: 0 };
  const messages = [];
  const markers = [];
  let map;
  class Element {
    attributes = {};
    children = [];
    style = { setProperty() {} };
    setAttribute(key, value) { this.attributes[key] = value; }
    getAttribute(key) { return this.attributes[key] ?? null; }
    set src(value) { this.attributes.src = value; }
    appendChild(child) { this.children.push(child); }
    querySelector() { return this.children[0]; }
  }
  class Marker {
    constructor(options) { calls.markers++; markers.push(this); this.element = options.element ?? new Element(); this.offset = { x: 0, y: 0 }; }
    setLngLat([lng, lat]) { calls.position++; this.point = { lng, lat }; return this; }
    getLngLat() { return this.point; }
    setOffset([x, y]) { calls.offset++; this.offset = { x, y }; return this; }
    getOffset() { return this.offset; }
    getElement() { return this.element; }
    addTo() { return this; }
    remove() { calls.removed++; }
    on() { return this; }
  }
  class FakeMap {
    events = {};
    features = [];
    constructor() { map = this; }
    on(name, handler) { (this.events[name] ??= []).push(handler); }
    emit(name, data) { for (const handler of this.events[name] ?? []) handler(data); }
    getStyle() { return { layers: [{ id: 'background', type: 'background' }, { id: 'water', type: 'fill' }] }; }
    setPaintProperty() { calls.paint++; }
    addSource() {}
    addLayer() {}
    getSource() { return { setData: data => { calls.data++; this.features = data.features; } }; }
    isSourceLoaded() { return true; }
    querySourceFeatures() { return this.features; }
    getBounds() { return { contains: () => true }; }
    fitBounds() {}
    jumpTo() {}
    easeTo() {}
    resize() {}
  }
  const window = { parent: { postMessage: message => messages.push(JSON.parse(message)) }, addEventListener() {} };
  const engine = { Map: FakeMap, Marker, LngLatBounds: class { extend() {} } };
  window.maplibregl = engine;
  const elements = new Map();
  const document = {
    documentElement: new Element(),
    getElementById: id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
    createElement: () => new Element(),
  };
  const script = mapDocument().match(/<script>\n([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script, { window, document, maplibregl: engine, setTimeout() {}, console, ResizeObserver: class { observe() {} } });
  const config = { colors: { primary: '#a04b64', surface: '#fff', background: '#fafafa' }, items: [
    { id: 'checkin-a', title: 'Đà Lạt', latitude: 11.94, longitude: 108.44, uri: '' },
  ] };
  const update = value => window.receiveMapConfig(structuredClone(value));
  update(config);
  map.emit('load');
  return { calls, messages, markers, map, config, update };
}

test('viewport feedback and equivalent bridge messages do not restyle or recluster the map', () => {
  const h = harness();
  const baseline = { ...h.calls };
  for (let index = 0; index < 30; index++) {
    h.update({ ...h.config, viewport: { center: [108.44 + index / 1000, 11.94], zoom: 15 } });
    h.map.emit('idle');
  }
  assert.deepEqual(h.calls, baseline);
});

test('thumbnail arrivals update the visible pin without copying photos into the clustering source', () => {
  const h = harness();
  const baseline = { ...h.calls };
  const uri = `data:image/jpeg;base64,${'A'.repeat(20000)}`;
  h.update({ ...h.config, items: [{ ...h.config.items[0], uri }] });
  assert.deepEqual(h.calls, baseline);
  assert.equal(JSON.stringify(h.map.features).includes('data:image'), false);
  assert.equal(h.messages.filter(message => message.type === 'photo').length, 1);
  assert.equal(h.markers[0].getElement().querySelector('img').getAttribute('src'), uri);
  h.markers[0].getElement().onclick({ stopPropagation() {} });
  assert.deepEqual(h.messages.at(-1), { type: 'open', id: 'checkin-a' });
});

test('real coordinate changes update pins and selected marker changes are applied only once', () => {
  const h = harness();
  const selected = { latitude: 11.95, longitude: 108.45 };
  h.update({ ...h.config, selected });
  const baseline = { ...h.calls };
  h.update({ ...h.config, selected: { ...selected } });
  h.map.emit('idle');
  assert.deepEqual(h.calls, baseline);
  h.update({ ...h.config, selected, items: [{ ...h.config.items[0], latitude: 12 }] });
  assert.equal(h.calls.data, baseline.data + 1);
  assert.equal(h.calls.position, baseline.position + 1);
  h.update({ ...h.config, selected: { ...selected, latitude: 12 } });
  assert.equal(h.calls.removed, baseline.removed + 1);
});
