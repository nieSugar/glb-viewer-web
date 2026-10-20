import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const globals = new Map(['document', 'window', 'localStorage', 'navigator', 'fetch'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('..', import.meta.url)),
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null, hmr: false },
  appType: 'custom'
});
const deferred = () =>
{
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const element = () =>
{
  const classes = new Set();
  const attributes = new Map();
  return {
    classList: {
      add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value),
      toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value)
    },
    setAttribute: (name, value) => attributes.set(name, value), getAttribute: name => attributes.get(name),
    prepend() {}, value: '', click() {}, addEventListener() {}
  };
};

try
{
  const { HomeView } = await server.ssrLoadModule('/app/js/views/home/HomeView.js');
  const { MainApplication } = await server.ssrLoadModule('/app/js/MainApplication.js');
  const make_home = () =>
  {
    const posts = [];
    const elements = new Map();
    const container = element();
    container.querySelector = selector =>
    {
      if (!elements.has(selector)) elements.set(selector, element());
      return elements.get(selector);
    };
    const iframe = container.querySelector('.home__iframe iframe');
    let src = '', navigation_count = 0;
    Object.defineProperty(iframe, 'src', { get: () => src, set: value => { src = value; navigation_count++; } });
    iframe.contentWindow = { postMessage: (message, origin, transferables) => posts.push({ message, origin, transferables }) };
    globalThis.document = {
      baseURI: 'https://example.test/viewer/index.html', documentElement: {}, body: element(),
      querySelector: () => container, querySelectorAll: () => [], createElement: element, addEventListener() {}
    };
    globalThis.window = { location: { origin: 'https://example.test' }, addEventListener() {} };
    globalThis.localStorage = { getItem: () => 'en', setItem() {} };
    Object.defineProperty(globalThis, 'navigator', { value: { language: 'en' }, configurable: true });
    const home = new HomeView();
    home.start();
    assert.equal(new URL(iframe.src).searchParams.get('hostOrigin'), window.location.origin);
    home.on_iframe_ready();
    assert.deepEqual(posts.find(post => post.message.type === 'setHostCapabilities').message.capabilities,
      { openJson: true, openAsText: true, openInBlender: false });
    const app = new MainApplication();
    app.home_view = home;
    const receive = message => app.on_viewer_message({ source: iframe.contentWindow, origin: new URL(iframe.src).origin, data: message });
    return { home, app, posts, iframe, receive, navigation_count: () => navigation_count };
  };
  const file = (name, read = async() => new ArrayBuffer(4)) => ({ name, arrayBuffer: read });
  const change = (home, files) => home.on_file_change({ target: { files } });
  const loads = posts => posts.filter(post => post.message.type.startsWith('loadModel'));

  {
    const { home, posts, receive, iframe, navigation_count } = make_home();
    const slow = deferred();
    const first = change(home, [file('old.glb', () => slow.promise)]);
    const oldId = home._active_request_id;
    await change(home, [file('new.glb')]);
    const newId = home._active_request_id;
    slow.resolve(new ArrayBuffer(8));
    await first;
    assert.equal(loads(posts).length, 1, 'A stale file read must not reach the viewer');
    assert.equal(loads(posts)[0].message.requestId, newId);
    assert.deepEqual(posts.filter(post => post.message.type === 'beginModelLoad').map(post => post.message.requestId), [oldId, newId]);
    assert.equal(home.modal_loading.classList.contains('hidden'), false, 'Sending the model is not successful loading');
    receive({ type: 'modelLoadState', requestId: oldId, status: 'error' });
    assert.equal(home._active_request_id, newId);
    receive({ type: 'modelLoadState', requestId: newId, status: 'loaded' });
    assert.equal(home.modal.classList.contains('hidden'), true);
    const original_window = iframe.contentWindow;
    home.on_change_model_click();
    assert.equal(navigation_count(), 1, 'Changing the model must preserve the iframe');
    assert.equal(iframe.contentWindow, original_window);
    home.input.value = 'previous.glb';
    home.trigger_file_input();
    assert.equal(home.input.value, '', 'The same file can be selected again');
    for (const post of posts) assert.equal(post.origin, new URL(iframe.src).origin);
    assert.equal(loads(posts)[0].transferables[0], loads(posts)[0].message.data);
  }

  {
    const { home, posts } = make_home();
    const slow = deferred();
    let unusedReads = 0;
    const first = change(home, [file('old.gltf', () => slow.promise), file('texture.bin', () => { unusedReads++; return new ArrayBuffer(4); })]);
    await change(home, [file('new.glb')]);
    slow.resolve(new ArrayBuffer(8));
    await first;
    assert.equal(unusedReads, 0, 'A superseded glTF selection stops reading remaining resources');
    assert.equal(loads(posts).length, 1);
    await change(home, [file('model.gltf'), file('texture.bin')]);
    const payload = loads(posts).at(-1);
    assert.equal(payload.message.type, 'loadModelFromFiles');
    assert.equal(payload.message.requestId, home._active_request_id);
    assert.equal(payload.transferables.length, 2);
  }

  {
    const { home, posts } = make_home();
    let return_entries, fileReads = 0;
    const directory = { isDirectory: true, createReader: () => ({ readEntries: resolve => { return_entries = resolve; } }) };
    const pending_drop = home.on_drop_drop({ preventDefault() {}, dataTransfer: { items: [{ kind: 'file', webkitGetAsEntry: () => directory }] } });
    await change(home, [file('new.glb')]);
    return_entries([{ isFile: true, name: 'old.glb', file: () => { fileReads++; } }]);
    await pending_drop;
    assert.equal(fileReads, 0, 'A stale directory listing must not begin reading files');
    assert.equal(loads(posts).length, 1);

    const failing_directory = { isDirectory: true, createReader: () => ({ readEntries: (_resolve, reject) => reject(new Error('directory unavailable')) }) };
    await home.on_drop_drop({ preventDefault() {}, dataTransfer: { items: [{ kind: 'file', webkitGetAsEntry: () => failing_directory }] } });
    assert.equal(home.modal_content.classList.contains('hidden'), false);
    assert.equal(home.modal_loading.classList.contains('hidden'), true);
    assert.equal(home.load_error.textContent, home.t('loadFailed'));
    assert.equal(posts.at(-1).message.type, 'cancelModelLoad');
  }

  {
    const { home, posts, receive } = make_home();
    const first_head = deferred();
    globalThis.fetch = url => url === home.examples.chick.url ? first_head.promise : Promise.resolve({ headers: { get: () => '12' } });
    const first = home.on_example_click('chick');
    await home.on_example_click('toy_car');
    const current = home._active_request_id;
    first_head.resolve({ headers: { get: () => '99' } });
    await first;
    assert.equal(loads(posts).length, 1, 'A stale HEAD response must not replace the selected example');
    assert.equal(loads(posts)[0].message.dataUri, home.examples.toy_car.url);
    receive({ type: 'modelLoadState', requestId: current, status: 'error', error: 'invalid glTF' });
    assert.equal(home.modal_content.classList.contains('hidden'), false);
    assert.equal(home.load_error.textContent, home.t('loadFailed'));
    await change(home, [file('unreadable.glb', async() => { throw new Error('read failed'); })]);
    assert.equal(home.modal_loading.classList.contains('hidden'), true);
    await change(home, [file('retry.glb')]);
    assert.equal(loads(posts).length, 2, 'A read or decode failure must allow another selection');
    assert.equal(home.load_error.classList.contains('hidden'), true);
  }

  {
    const { home, posts, receive } = make_home();
    const old_read = deferred();
    const first = change(home, [file('old.glb', () => old_read.promise)]);
    await change(home, [file('current.glb')]);
    const current = home._active_request_id;
    old_read.reject(new Error('stale read failed'));
    await first;
    assert.equal(home._active_request_id, current, 'A stale failure cannot reset the current loading state');
    assert.equal(home.load_error.classList.contains('hidden'), true);
    home.on_change_model_click();
    assert.deepEqual(posts.at(-1).message, { type: 'cancelModelLoad', requestId: current });
    receive({ type: 'modelLoadState', requestId: current, status: 'loaded' });
    assert.equal(home.modal.classList.contains('hidden'), false, 'A cancelled success cannot close the model picker');
  }

  {
    const { home, posts, receive } = make_home();
    const pending_read = deferred();
    const first = change(home, [file('before-reload.glb', () => pending_read.promise)]);
    const previous = home._active_request_id;
    receive({ type: 'ready' });
    assert.equal(home._active_request_id, null, 'A new viewer session invalidates the previous selection');
    assert.equal(home.modal_content.classList.contains('hidden'), false);
    assert.equal(home.modal_loading.classList.contains('hidden'), true);
    pending_read.resolve(new ArrayBuffer(4));
    await first;
    assert.equal(loads(posts).length, 0, 'An old read cannot send a model to the reloaded viewer');
    receive({ type: 'modelLoadState', requestId: previous, status: 'loaded' });
    assert.equal(home.modal.classList.contains('hidden'), false);
    await change(home, [file('after-reload.glb')]);
    assert.equal(loads(posts).length, 1);
    assert.notEqual(loads(posts)[0].message.requestId, previous);
    receive({ type: 'modelLoadState', requestId: home._active_request_id, status: 'loaded' });
    assert.equal(home.modal.classList.contains('hidden'), true, 'A fresh selection can load after the viewer reloads');
  }

  {
    const { home, posts } = make_home();
    home._iframe_ready = false;
    let reads = 0;
    await change(home, [file('early.glb', () => { reads++; return new ArrayBuffer(4); })]);
    assert.equal(reads, 0, 'Do not send a model before the viewer is ready');
    assert.equal(home.load_error.textContent, home.t('viewerNotReady'));
    assert.equal(loads(posts).length, 0);
  }

  {
    const { home, app, iframe, receive } = make_home();
    let ready = 0, controls = 0, results = 0, json = 0;
    home.on_iframe_ready = () => ready++;
    home.set_controls_hidden = () => controls++;
    home.on_model_load_state = () => results++;
    app.open_info_in_new_tab = () => json++;
    app.on_viewer_message({ source: {}, origin: new URL(iframe.src).origin, data: { type: 'ready' } });
    app.on_viewer_message({ source: iframe.contentWindow, origin: 'https://untrusted.test', data: { type: 'ready' } });
    for (const data of [null, [], 'ready', { type: 'controlsHidden', hidden: 'false' },
      { type: 'modelLoadState', requestId: 1, status: 'loaded' }, { type: 'modelLoadState', requestId: 'x', status: 'pending' },
      { type: 'modelLoadState', requestId: 'x', status: 'error', error: {} }, { type: 'openJson', payload: 'text' }, { type: 'openInBlender' }]) receive(data);
    assert.deepEqual([ready, controls, results, json], [0, 0, 0, 0]);
    receive({ type: 'ready' });
    receive({ type: 'controlsHidden', hidden: true });
    receive({ type: 'modelLoadState', requestId: 'x', status: 'loaded' });
    receive({ type: 'openJson', payload: { asset: { version: '2.0' } } });
    assert.deepEqual([ready, controls, results, json], [1, 1, 1, 1]);
  }
  console.log('Web host request, recovery and message boundary checks passed.');
}
finally
{
  await server.close();
  for (const [name, descriptor] of globals)
  {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
}
