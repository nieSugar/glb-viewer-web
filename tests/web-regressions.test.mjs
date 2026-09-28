import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const originalDocument = globalThis.document;
try
{
  for (const base of ['./', '/viewer/'])
  {
    const server = await createServer({
      configFile: false,
      root: fileURLToPath(new URL('..', import.meta.url)),
      base,
      optimizeDeps: { noDiscovery: true, include: [] },
      server: { middlewareMode: true, watch: null, hmr: false },
      appType: 'custom'
    });
    try
    {
      // Vite's dev server normalizes './' to '/'; exercise the production value.
      server.config.env.BASE_URL = base;
      const { HomeView } = await server.ssrLoadModule('/app/js/views/home/HomeView.js');
      const home = Object.create(HomeView.prototype);
      for (const directory of ['/', '/viewer/'])
      {
        globalThis.document = { baseURI: `https://example.test${directory}index.html` };
        const expectedBase = base === './' ? directory : base;
        for (const resource of ['models/chick.glb', 'webview/', 'webview/index.html'])
        {
          const actual = home.get_public_path(resource);
          const expected = `https://example.test${expectedBase}${resource}`;
          assert.equal(actual, expected);
          assert.equal(new URL(actual, 'https://example.test/webview/index.html').href, expected,
            'The iframe must resolve the same resource as its parent');
        }
      }
    }
    finally
    {
      await server.close();
    }
  }
}
finally
{
  globalThis.document = originalDocument;
}

console.log('Web resource URL checks passed.');
