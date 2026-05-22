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
        selectFile: 'Select -> File',
        dropFileFolder: 'Drop -> File/Folder',
        examplesTitle: 'Or try one of these:',
        exampleChick: 'Chick',
        exampleCubohzi: 'Cubohzi',
        exampleToyCar: 'Toy Car',
        loading: 'Loading...',
        changeModel: 'Change Model',
        invalidFile: 'Please select a valid file'
      },
      zh: {
        languageLabel: '语言',
        title: 'GLTF/GLB 查看器',
        subtitle: '查看并检查你的 GLTF/GLB 文件。',
        selectFile: '选择 -> 文件',
        dropFileFolder: '拖放 -> 文件/文件夹',
        examplesTitle: '或试试这些示例：',
        exampleChick: '小鸡',
        exampleCubohzi: '方块仔',
        exampleToyCar: '玩具车',
        loading: '加载中...',
        changeModel: '更换模型',
        invalidFile: '请选择有效的模型文件'
      }
    };

    this.language_storage_key = 'homeViewLanguage';
    this.current_language = this.get_default_language();
  }

  start()
  {
    this.iframe_container = this.container.querySelector('.home__iframe');
    this.iframe = this.container.querySelector('.home__iframe iframe');

    this.modal = this.container.querySelector('.home__modal');
    this.modal_content = this.container.querySelector('.home__modal-content');
    this.modal_loading = this.container.querySelector('.home__modal-loading');

    this.change_model_button = this.container.querySelector('.home__change-model-button');

    this.input = this.container.querySelector('.home__modal-input');

    this.language_select = this.container.querySelector('.home__language-select');
    this.localized_elements = this.container.querySelectorAll('[data-i18n]');
    this.localized_attribute_elements = this.container.querySelectorAll('[data-i18n-attr]');

    this.blur = this.container.querySelector('.home__blur');

    // Load app
    this.iframe.src = import.meta.env.DEV ? 'http://localhost:1235/webview/' : '/webview/index.html';

    this.drop_area = this.container.querySelector('.home__drop-area');
    this._dragEnterCount = 0;

    document.body.addEventListener('dragenter', this.on_drop_dragenter.bind(this));
    document.body.addEventListener('dragover', this.on_drop_dragover.bind(this));
    document.body.addEventListener('dragleave', this.on_drop_dragleave.bind(this));
    document.body.addEventListener('dragend', this.on_drop_reset.bind(this));
    document.body.addEventListener('drop', this.on_drop_drop.bind(this));

    const model_url = import.meta.env.DEV ? 'http://localhost:1234/models/' : '/models/';
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

    if (this.iframe && this.iframe.contentWindow)
    {
      this.iframe.contentWindow.postMessage({
        type: 'updateLanguage',
        language: target_language
      }, '*');
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

  on_iframe_ready()
  {
    // TODO: Add ability to modify these settings from web
    const config = {
      prettifyPropertyLabels: true,
      relevant3dObjectKeys: [
        'name',
        'type',
        'position',
        'rotation',
        'scale',
        'globalScale',
        'userData'
      ]
    };

    this.modal.classList.remove('hidden');

    this.iframe.contentWindow.postMessage({
      type: 'updateConfig',
      config: config
    }, '*');

    this.iframe.contentWindow.postMessage({
      type: 'setWebViewPath',
      webview_path: '/webview/'
    }, '*');

    this.iframe.contentWindow.postMessage({
      type: 'updateLanguage',
      language: this.current_language
    }, '*');
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

  trigger_file_input()
  {
    this.input.click();
  }

  on_file_change(event, dropped_files = null)
  {
    const files = Array.from(dropped_files || event.target.files);

    const has_gltf = files.some(file => file.name.toLowerCase().endsWith('.gltf'));

    if (!has_gltf)
    {
      const file = files.find(file => file.name.toLowerCase().endsWith('.glb'));
      if (!file)
      {
        alert(this.t('invalidFile'));
        return;
      }

      this.load_single_file_model(file);
    }
    else if (has_gltf)
    {
      // search for a gltf file
      const file = files.find(file => file.name.toLowerCase().endsWith('.gltf'));

      if (file)
      {
        this.load_gltf_with_resources(file, files);
      }
    }
  }

  async load_single_file_model(file)
  {
    this.show_loading();

    const arrayBuffer = await file.arrayBuffer();

    this.iframe.contentWindow.postMessage({
      type: 'loadModelFromBinary',
      data: arrayBuffer,
      extension: file.name.split('.').pop().toLowerCase(),
      fileSize: arrayBuffer.byteLength
    }, '*', [arrayBuffer]);

    this.on_model_load_started();
  }

  async load_gltf_with_resources(gltfFile, allFiles)
  {
    this.show_loading();

    const files = [];
    const transferables = [];

    for (const file of allFiles)
    {
      const arrayBuffer = await file.arrayBuffer();
      transferables.push(arrayBuffer);
      files.push({
        name: this.getTransferFileName(file),
        mimeType: file.type || this.getMimeType(file.name),
        data: arrayBuffer
      });
    }

    this.iframe.contentWindow.postMessage({
      type: 'loadModelFromFiles',
      files: files,
      entryFileName: this.getTransferFileName(gltfFile),
      extension: 'gltf',
      fileSize: files.reduce((total, file) => total + file.data.byteLength, 0)
    }, '*', transferables);

    this.on_model_load_started();
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
    const items = Array.from(event.dataTransfer.items);

    const entries = items
      .filter(item => item.kind === 'file')
      .map(item => item.webkitGetAsEntry())
      .filter(entry => entry !== null);

    // If single folder dropped, collect all files from it
    if (entries.length === 1 && entries[0].isDirectory)
    {
      const files = await this.read_directory(entries[0]);
      if (files.length > 0)
      {
        this.on_file_change(null, files);
      }
      return;
    }

    // If multiple files or mix of files/folders dropped
    const allFiles = [];
    for (const entry of entries)
    {
      if (entry.isFile)
      {
        const file = await this.get_file_from_entry(entry, entry.fullPath?.replace(/^\/+/, '') || entry.name);
        allFiles.push(file);
      }
      else if (entry.isDirectory)
      {
        const files = await this.read_directory(entry);
        allFiles.push(...files);
      }
    }

    if (allFiles.length > 0)
    {
      this.on_file_change(null, allFiles);
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

  async read_directory(directoryEntry)
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
    while (entries.length > 0)
    {
      for (const entry of entries)
      {
        if (entry.isFile)
        {
          const file = await this.get_file_from_entry(entry, entry.fullPath?.replace(/^\/+/, '') || entry.name);
          files.push(file);
        }
        else if (entry.isDirectory)
        {
          const nestedFiles = await this.read_directory(entry);
          files.push(...nestedFiles);
        }
      }
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
    this.show_loading();

    let fileSize = 0;
    try
    {
      const response = await fetch(this.examples[index].url, { method: 'HEAD' });
      fileSize = Number(response.headers.get('content-length')) || 0;
    }
    catch (error)
    {
      console.warn('Unable to fetch example file size:', error);
    }

    this.iframe.contentWindow.postMessage({
      type: 'loadModelFromUri',
      dataUri: this.examples[index].url,
      extension: this.examples[index].url.split('.').pop().toLowerCase(),
      fileSize: fileSize
    }, '*');

    this.on_model_load_started();
  }

  show_loading()
  {
    this.modal_content.classList.add('hidden');
    this.modal_loading.classList.remove('hidden');
  }

  on_model_load_started()
  {
    this.modal.classList.add('hidden');
    this.iframe_container.classList.remove('disabled');
    this.blur.classList.add('hidden');
    this.change_model_button.classList.remove('hidden');
  }

  on_change_model_click()
  {
    // this.modal.classList.remove('hidden');
    // this.modal_content.classList.remove('hidden');
    // this.iframe_container.classList.add('disabled');
    // this.blur.classList.remove('hidden');
    // this.input.value = '';
    // this.modal_loading.classList.add('hidden');
    // this.change_model_button.classList.add('hidden');

    window.location.reload();
  }
}
