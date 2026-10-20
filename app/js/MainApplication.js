import { HomeView } from './views/home/HomeView';

export class MainApplication
{
  constructor()
  {
  }

  start()
  {
    this.home_view = new HomeView();
    window.addEventListener('message', event => this.on_viewer_message(event));
    this.home_view.start();
    this.home_view.on_enter();
  }

  on_viewer_message(event)
  {
    const iframe = this.home_view.iframe;
    if (!iframe || event.source !== iframe.contentWindow || event.origin !== new URL(iframe.src).origin) return;
    const message = event.data;
    if (!message || typeof message !== 'object' || Array.isArray(message)) return;

    switch (message.type)
    {
    case 'ready':
      this.home_view.on_iframe_ready();
      break;
    case 'controlsHidden':
      if (typeof message.hidden === 'boolean') this.home_view.set_controls_hidden(message.hidden);
      break;
    case 'modelLoadState':
      if (typeof message.requestId !== 'string' || !message.requestId ||
          !['loaded', 'error'].includes(message.status) ||
          (message.error !== undefined && typeof message.error !== 'string')) return;
      this.home_view.on_model_load_state(message);
      break;
    case 'openJson':
    case 'openAsText':
      if (message.payload && typeof message.payload === 'object') this.open_info_in_new_tab(message.payload);
      break;
    }
  }

  update()
  {
    this.home_view.update();
  }

  open_info_in_new_tab(payload)
  {
    if (!payload)
    {
      console.warn('No payload provided for openAsText/openJson');
      return;
    }

    let content = '';
    let mimeType = '';
    let filename = '';

    try
    {
      content = JSON.stringify(payload, null, 2);
    }
    catch (error)
    {
      console.warn('Unable to serialize viewer data:', error);
      return;
    }
    mimeType = 'application/json';
    filename = 'data.json';

    // Create a blob with the content
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    // Open in new tab
    const newTab = window.open(url, '_blank');

    // Set a timeout to revoke the URL after a delay to allow the tab to load
    setTimeout(() =>
    {
      URL.revokeObjectURL(url);
    }, 1000);

    // If popup was blocked, fallback to download
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined')
    {
      this.download_payload(content, filename, mimeType);
    }
  }

  download_payload(content, filename, mimeType)
  {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}
