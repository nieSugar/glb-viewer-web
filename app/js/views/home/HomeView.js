import { Sections, SectionsURLs } from '../Sections';

export class HomeView
{
  constructor()
  {
    this.name = Sections.HOME;
    this.url = SectionsURLs.HOME;
    this.container = document.querySelector('.home');

    this.translations = {
      en: {
        languageLabel: 'Language',
        title: 'GLTF/GLB Viewer',
        subtitle: 'View and inspect your GLTF/GLB files.',
        seoExplore: 'View and explore your GLTF/GLB files.',
        viewerIconAlt: 'GLTF/GLB Viewer icon',
        exampleChickAlt: 'Chick model preview',
        exampleCubohziAlt: 'Cubohzi model preview',
        exampleToyCarAlt: 'Toy Car model preview',
        selectFile: 'Select -> File',
        dropFileFolder: 'Drop -> File/Folder',
        examplesTitle: 'Or try one of these:',
        exampleChick: 'Chick',
        exampleCubohzi: 'Cubohzi',
        exampleToyCar: 'Toy Car',
        loading: 'Loading...',
        changeModel: 'Change Model',
        invalidFile: 'Please select a valid model file.',
        loadFailed: 'Unable to load this model. Check the file and its resources, then try again.',
        viewerNotReady: 'The viewer is not ready yet. Please try again shortly.'
      },
      zh: {
        languageLabel: '语言',
        title: 'GLTF/GLB 查看器',
        subtitle: '查看并检查你的 GLTF/GLB 文件。',
        seoExplore: '查看并探索你的 GLTF/GLB 文件。',
        viewerIconAlt: 'GLTF/GLB 查看器图标',
        exampleChickAlt: '小鸡模型预览',
        exampleCubohziAlt: '方块仔模型预览',
        exampleToyCarAlt: '玩具车模型预览',
        selectFile: '选择 -> 文件',
        dropFileFolder: '拖放 -> 文件/文件夹',
        examplesTitle: '或试试这些示例：',
        exampleChick: '小鸡',
        exampleCubohzi: '方块仔',
        exampleToyCar: '玩具车',
        loading: '加载中...',
        changeModel: '更换模型',
        invalidFile: '请选择有效的模型文件。',
        loadFailed: '模型加载失败，请检查文件及其关联资源，然后重试。',
        viewerNotReady: '查看器尚未准备好，请稍后重试。'
      }
    };

    this.language_storage_key = 'homeViewLanguage';
    this.current_language = this.get_default_language();
    this._request_sequence = 0;
    this._active_request_id = null;
    this._iframe_ready = false;
  }

  start()
  {
    this.iframe_container = this.container.querySelector('.home__iframe');
    this.iframe = this.container.querySelector('.home__iframe iframe');

    this.modal = this.container.querySelector('.home__modal');
    this.modal_content = this.container.querySelector('.home__modal-content');
    this.modal_loading = this.container.querySelector('.home__modal-loading');
    this.load_error = document.createElement('div');
    this.load_error.className = 'home__load-error hidden';
    this.load_error.setAttribute('role', 'alert');
    this.load_error.setAttribute('data-i18n', 'loadFailed');
    this.modal_content.prepend(this.load_error);

    this.change_model_button = this.container.querySelector('.home__change-model-button');

    this.input = this.container.querySelector('.home__modal-input');

    this.language_select = this.container.querySelector('.home__language-select');
    this.localized_elements = document.querySelectorAll('[data-i18n]');
    this.localized_attribute_elements = document.querySelectorAll('[data-i18n-attr]');

    this.blur = this.container.querySelector('.home__blur');

    this.webview_path = import.meta.env.DEV ? 'http://localhost:1235/webview/' : this.get_public_path('webview/');

    const iframe_url = new URL(import.meta.env.DEV ? this.webview_path : this.get_public_path('webview/index.html'));
    iframe_url.searchParams.set('hostOrigin', window.location.origin);
    this.iframe.src = iframe_url.href;

    this.drop_area = this.container.querySelector('.home__drop-area');
    this._dragEnterCount = 0;

    document.body.addEventListener('dragenter', this.on_drop_dragenter.bind(this));
    document.body.addEventListener('dragover', this.on_drop_dragover.bind(this));
    document.body.addEventListener('dragleave', this.on_drop_dragleave.bind(this));
    document.body.addEventListener('dragend', this.on_drop_reset.bind(this));
    document.body.addEventListener('drop', this.on_drop_drop.bind(this));
    document.addEventListener('keydown', this.on_keydown.bind(this));

    const model_url = import.meta.env.DEV ? 'http://localhost:1234/models/' : this.get_public_path('models/');
    this.examples = {
      chick: {
        name: 'Chick',
        url: model_url + 'chick.glb'
      },
      cubohzi: {
        name: 'Cubozi',
        url: model_url + 'cubohzi.glb'
      },
      toy_car: {
        name: 'Toy Car',
        url: model_url + 'toy_car.glb'
      }
    };

    if (this.language_select)
    {
      this.language_select.value = this.current_language;
    }

    this.apply_language(this.current_language);
  }

  get_default_language()
  {
    const stored_language = localStorage.getItem(this.language_storage_key);

    if (stored_language && this.translations[stored_language])
    {
      return stored_language;
    }

    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  get_public_path(path)
  {
    const base_url = import.meta.env.BASE_URL || '/';
    const normalized_base_url = base_url.endsWith('/') ? base_url : `${base_url}/`;
    const normalized_path = path.replace(/^\/+/, '');

    return new URL(`${normalized_base_url}${normalized_path}`, document.baseURI).href;
  }

  t(key)
  {
    const active = this.translations[this.current_language] || this.translations.en;
    return active[key] || this.translations.en[key] || key;
  }

  apply_language(language)
  {
    const target_language = this.translations[language] ? language : 'en';

    this.current_language = target_language;
    localStorage.setItem(this.language_storage_key, target_language);
    document.documentElement.lang = target_language === 'zh' ? 'zh-CN' : 'en';
    document.title = this.t('title');

    if (this.iframe && this.iframe.contentWindow)
    {
      this.post_to_viewer({ type: 'updateLanguage', language: target_language });
    }

    this.localized_elements.forEach((element) =>
    {
      const key = element.getAttribute('data-i18n');
      if (!key)
      {
        return;
      }

      element.textContent = this.t(key);
    });

    this.localized_attribute_elements.forEach((element) =>
    {
      const mapping = element.getAttribute('data-i18n-attr');
      if (!mapping)
      {
        return;
      }

      const [key, attribute] = mapping.split(':');
      if (!key || !attribute)
      {
        return;
      }

      element.setAttribute(attribute, this.t(key));
    });
  }

  on_language_change(event)
  {
    this.apply_language(event.target.value);
  }

  post_to_viewer(message, transferables = [])
  {
    this.iframe.contentWindow.postMessage(message, new URL(this.iframe.src).origin, transferables);
  }

  on_iframe_ready()
  {
    this._active_request_id = null;
    this._iframe_ready = true;
    // TODO: Add ability to modify these settings from web
    const config = {
      prettifyPropertyLabels: true,
      relevant3dObjectKeys: [
        'name',
        'visible',
        'type',
        'position',
        'rotation',
        'scale',
        'globalScale',
        'userData'
      ]
    };

    this.show_model_selection();

    this.post_to_viewer({ type: 'updateConfig', config });
    this.post_to_viewer({ type: 'setWebViewPath', webview_path: this.webview_path });
    this.post_to_viewer({ type: 'updateLanguage', language: this.current_language });
    this.post_to_viewer({
      type: 'setHostCapabilities',
      capabilities: { openJson: true, openAsText: true, openInBlender: false }
    });
  }

  on_enter()
  {
    this.container.classList.remove('hidden');
  }

  on_exit()
  {
    this.container.classList.add('hidden');
  }

  update()
  {
  }

  on_keydown(event)
  {
    const target = event.target;
    const is_editing = target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable;

    if (event.key.toLowerCase() !== 'h' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || is_editing)
    {
      return;
    }

    this.set_controls_hidden(!this.container.classList.contains('controls-hidden'));
  }

  set_controls_hidden(hidden)
  {
    this.container.classList.toggle('controls-hidden', hidden);
    this.post_to_viewer({ type: 'setControlsHidden', hidden });
  }

  trigger_file_input()
  {
    this.input.value = '';
    this.input.click();
  }

  async on_file_change(event, dropped_files = null, requestId = null)
  {
    const files = Array.from(dropped_files || event.target.files);
    if (!files.length && !requestId) return;
    requestId = requestId || this.begin_model_request();
    if (!requestId || requestId !== this._active_request_id) return;
    this.input.value = '';

    try
    {
      const gltf = files.find(file => file.name.toLowerCase().endsWith('.gltf'));
      const glb = files.find(file => file.name.toLowerCase().endsWith('.glb'));
      if (gltf) await this.load_gltf_with_resources(gltf, files, requestId);
      else if (glb) await this.load_single_file_model(glb, requestId);
      else this.fail_model_request(requestId, 'invalidFile');
    }
    catch (error)
    {
      this.fail_model_request(requestId, 'loadFailed', error);
    }
  }

  async load_single_file_model(file, requestId)
  {
    const arrayBuffer = await file.arrayBuffer();
    if (requestId !== this._active_request_id) return;

    this.post_to_viewer({
      type: 'loadModelFromBinary',
      requestId,
      data: arrayBuffer,
      extension: file.name.split('.').pop().toLowerCase(),
      fileSize: arrayBuffer.byteLength
    }, [arrayBuffer]);
  }

  async load_gltf_with_resources(gltfFile, allFiles, requestId)
  {
    const files = [];
    const transferables = [];

    for (const file of allFiles)
    {
      if (requestId !== this._active_request_id) return;
      const arrayBuffer = await file.arrayBuffer();
      if (requestId !== this._active_request_id) return;
      transferables.push(arrayBuffer);
      files.push({
        name: this.getTransferFileName(file),
        mimeType: file.type || this.getMimeType(file.name),
        data: arrayBuffer
      });
    }

    this.post_to_viewer({
      type: 'loadModelFromFiles',
      requestId,
      files,
      entryFileName: this.getTransferFileName(gltfFile),
      extension: 'gltf',
      fileSize: files.reduce((total, file) => total + file.data.byteLength, 0)
    }, transferables);
  }

  getMimeType(filename)
  {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      ktx2: 'image/ktx2',
      basis: 'image/basis'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  getTransferFileName(file)
  {
    return file.relativePath || file.webkitRelativePath || file.name;
  }

  on_drop_dragenter(event)
  {
    event.preventDefault();
    this._dragEnterCount += 1;

    // Only show drop area on first enter
    if (this._dragEnterCount > 1)
    {
      return;
    }

    this.drop_area.classList.add('visible');
  }

  on_drop_dragover(event)
  {
    event.preventDefault();
  }

  on_drop_dragleave(event)
  {
    event.preventDefault();
    this._dragEnterCount -= 1;

    // Only hide when we've left all elements
    if (this._dragEnterCount === 0)
    {
      this.on_drop_reset();
    }
  }

  async on_drop_drop(event)
  {
    event.preventDefault();
    this.on_drop_reset();
    const requestId = this.begin_model_request();
    if (!requestId) return;

    try
    {
      const items = Array.from(event.dataTransfer.items);
      const entries = items
        .filter(item => item.kind === 'file')
        .map(item => item.webkitGetAsEntry())
        .filter(entry => entry !== null);
      const files = [];
      for (const entry of entries)
      {
        if (requestId !== this._active_request_id) return;
        if (entry.isFile)
        {
          files.push(await this.get_file_from_entry(entry, entry.fullPath?.replace(/^\/+/, '') || entry.name));
        }
        else if (entry.isDirectory)
        {
          files.push(...await this.read_directory(entry, requestId));
        }
        if (requestId !== this._active_request_id) return;
      }
      await this.on_file_change(null, files, requestId);
    }
    catch (error)
    {
      this.fail_model_request(requestId, 'loadFailed', error);
    }
  }

  async get_file_from_entry(fileEntry, relativePath = fileEntry.name)
  {
    return new Promise((resolve, reject) =>
    {
      fileEntry.file(file =>
      {
        file.relativePath = relativePath;
        resolve(file);
      }, reject);
    });
  }

  async read_directory(directoryEntry, requestId)
  {
    const files = [];
    const reader = directoryEntry.createReader();

    const read_entries = async() =>
    {
      return new Promise((resolve, reject) =>
      {
        reader.readEntries(resolve, reject);
      });
    };

    // Keep reading until no more entries (readEntries can return in batches)
    let entries = await read_entries();
    while (entries.length > 0 && requestId === this._active_request_id)
    {
      for (const entry of entries)
      {
        if (requestId !== this._active_request_id) return [];
        if (entry.isFile)
        {
          const file = await this.get_file_from_entry(entry, entry.fullPath?.replace(/^\/+/, '') || entry.name);
          if (requestId !== this._active_request_id) return [];
          files.push(file);
        }
        else if (entry.isDirectory)
        {
          const nestedFiles = await this.read_directory(entry, requestId);
          files.push(...nestedFiles);
        }
      }
      if (requestId !== this._active_request_id) return [];
      entries = await read_entries();
    }

    return files;
  }

  on_drop_reset()
  {
    this._dragEnterCount = 0;
    this.drop_area.classList.remove('visible');
  }

  async on_example_click(index)
  {
    const example = this.examples[index];
    if (!example) return;
    const requestId = this.begin_model_request();
    if (!requestId) return;

    let fileSize = 0;
    try
    {
      const response = await fetch(example.url, { method: 'HEAD' });
      fileSize = Number(response.headers.get('content-length')) || 0;
    }
    catch (error)
    {
      if (requestId === this._active_request_id) console.warn('Unable to fetch example file size:', error);
    }
    if (requestId !== this._active_request_id) return;

    try
    {
      this.post_to_viewer({
        type: 'loadModelFromUri',
        requestId,
        dataUri: example.url,
        extension: example.url.split('.').pop().toLowerCase(),
        fileSize
      });
    }
    catch (error)
    {
      this.fail_model_request(requestId, 'loadFailed', error);
    }
  }

  begin_model_request()
  {
    const requestId = 'web-' + ++this._request_sequence;
    this._active_request_id = requestId;
    if (!this._iframe_ready)
    {
      this.fail_model_request(requestId, 'viewerNotReady');
      return null;
    }
    this.show_loading();
    this.post_to_viewer({ type: 'beginModelLoad', requestId });
    return requestId;
  }

  show_loading()
  {
    this.modal.classList.remove('hidden');
    this.modal_content.classList.add('hidden');
    this.modal_loading.classList.remove('hidden');
    this.load_error.classList.add('hidden');
    this.change_model_button.classList.add('hidden');
    this.iframe_container.classList.add('disabled');
    this.blur.classList.remove('hidden');
  }

  on_model_load_state(message)
  {
    if (message.requestId !== this._active_request_id) return;
    if (message.status === 'error')
    {
      this.fail_model_request(message.requestId, 'loadFailed');
      return;
    }
    this._active_request_id = null;
    this.modal_loading.classList.add('hidden');
    this.modal.classList.add('hidden');
    this.iframe_container.classList.remove('disabled');
    this.blur.classList.add('hidden');
    this.change_model_button.classList.remove('hidden');
  }

  fail_model_request(requestId, key, error)
  {
    if (requestId !== this._active_request_id) return;
    if (error) console.warn('Unable to load model:', error);
    if (this._iframe_ready) this.post_to_viewer({ type: 'cancelModelLoad', requestId });
    this._active_request_id = null;
    this.show_model_selection();
    this.load_error.setAttribute('data-i18n', key);
    this.load_error.textContent = this.t(key);
    this.load_error.classList.remove('hidden');
  }

  show_model_selection()
  {
    this.modal.classList.remove('hidden');
    this.modal_content.classList.remove('hidden');
    this.iframe_container.classList.add('disabled');
    this.blur.classList.remove('hidden');
    this.input.value = '';
    this.modal_loading.classList.add('hidden');
    this.change_model_button.classList.add('hidden');
    this.load_error.classList.add('hidden');
  }

  on_change_model_click()
  {
    if (this._active_request_id) this.post_to_viewer({ type: 'cancelModelLoad', requestId: this._active_request_id });
    this._active_request_id = null;
    this.show_model_selection();
  }
}
