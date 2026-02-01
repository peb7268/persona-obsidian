/**
 * Mock implementations for Obsidian API
 * These mocks allow testing plugin code without running Obsidian
 */

// Jest mock utilities are available globally, no import needed

export class MockApp {
  workspace = new MockWorkspace();
  vault = new MockVault();
  metadataCache = new MockMetadataCache();
}

export class MockWorkspace {
  on = jest.fn();
  off = jest.fn();
  trigger = jest.fn();
  activeLeaf: any = null;
  getActiveFile = jest.fn(() => null);
  getActiveViewOfType = jest.fn(() => null);
  getRightLeaf = jest.fn(() => null);
  getLeftLeaf = jest.fn(() => null);
  revealLeaf = jest.fn();
}

export class MockVault {
  adapter = new MockFileSystemAdapter();
  configDir = '.obsidian';

  read = jest.fn();
  readBinary = jest.fn();
  cachedRead = jest.fn();
  create = jest.fn();
  modify = jest.fn();
  modifyBinary = jest.fn();
  delete = jest.fn();
  rename = jest.fn();
  getAbstractFileByPath = jest.fn();
  getMarkdownFiles = jest.fn(() => []);
  getFiles = jest.fn(() => []);
  getAllLoadedFiles = jest.fn(() => []);
  on = jest.fn();
  off = jest.fn();
  trigger = jest.fn();
}

export class MockFileSystemAdapter {
  basePath = '/mock/vault';

  getName = jest.fn();
  exists = jest.fn(() => Promise.resolve(true));
  stat = jest.fn();
  list = jest.fn(() => Promise.resolve({ files: [], folders: [] }));
  read = jest.fn();
  readBinary = jest.fn();
  write = jest.fn();
  writeBinary = jest.fn();
  append = jest.fn();
  process = jest.fn();
  getResourcePath = jest.fn();
  mkdir = jest.fn();
  trashSystem = jest.fn();
  trashLocal = jest.fn();
  rmdir = jest.fn();
  remove = jest.fn();
  rename = jest.fn();
  copy = jest.fn();
}

export class MockMetadataCache {
  on = jest.fn();
  off = jest.fn();
  trigger = jest.fn();
  getCache = jest.fn();
  getFileCache = jest.fn();
  resolvedLinks = {};
  unresolvedLinks = {};
}

export class MockPlugin {
  app: MockApp;
  manifest: any;

  constructor(app?: MockApp, manifest?: any) {
    this.app = app || new MockApp();
    this.manifest = manifest || {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      minAppVersion: '1.0.0',
      description: 'Test plugin',
      author: 'Test',
      authorUrl: '',
      isDesktopOnly: false,
    };
  }

  addCommand = jest.fn();
  addRibbonIcon = jest.fn();
  addStatusBarItem = jest.fn(() => new MockHTMLElement());
  addSettingTab = jest.fn();
  registerView = jest.fn();
  registerExtensions = jest.fn();
  registerMarkdownPostProcessor = jest.fn();
  registerMarkdownCodeBlockProcessor = jest.fn();
  registerCodeMirror = jest.fn();
  registerEditorExtension = jest.fn();
  registerObsidianProtocolHandler = jest.fn();
  registerEditorSuggest = jest.fn();
  loadData = jest.fn(() => Promise.resolve({}));
  saveData = jest.fn(() => Promise.resolve());
  registerInterval = jest.fn();
  registerEvent = jest.fn();
}

export class MockModal {
  app: MockApp;
  containerEl: MockHTMLElement;
  modalEl: MockHTMLElement;
  titleEl: MockHTMLElement;
  contentEl: MockHTMLElement;
  scope: any;

  constructor(app: MockApp) {
    this.app = app;
    this.containerEl = new MockHTMLElement();
    this.modalEl = new MockHTMLElement();
    this.titleEl = new MockHTMLElement();
    this.contentEl = new MockHTMLElement();
  }

  open = jest.fn();
  close = jest.fn();
  onOpen = jest.fn();
  onClose = jest.fn();
}

export class MockHTMLElement {
  className = '';
  classList = {
    add: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
    contains: jest.fn(),
  };
  innerHTML = '';
  textContent = '';
  style: any = {};
  children: MockHTMLElement[] = [];

  appendChild = jest.fn((child: MockHTMLElement) => {
    this.children.push(child);
    return child;
  });
  removeChild = jest.fn();
  createEl = jest.fn((tag: string) => new MockHTMLElement());
  createDiv = jest.fn(() => new MockHTMLElement());
  createSpan = jest.fn(() => new MockHTMLElement());
  empty = jest.fn(() => {
    this.children = [];
    this.innerHTML = '';
  });
  setText = jest.fn((text: string) => {
    this.textContent = text;
  });
  setAttr = jest.fn();
  getAttribute = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  click = jest.fn();
  focus = jest.fn();

  // Obsidian-specific methods
  addClass = jest.fn((cls: string) => {
    this.classList.add(cls);
  });
  removeClass = jest.fn((cls: string) => {
    this.classList.remove(cls);
  });
  toggleClass = jest.fn((cls: string, force?: boolean) => {
    this.classList.toggle(cls, force);
  });
  hasClass = jest.fn((cls: string) => {
    return this.classList.contains(cls);
  });
}

export class MockTFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  stat: { ctime: number; mtime: number; size: number };
  vault: MockVault;

  constructor(path: string) {
    this.path = path;
    const parts = path.split('/');
    this.name = parts[parts.length - 1];
    const nameParts = this.name.split('.');
    this.extension = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    this.basename = nameParts.slice(0, -1).join('.');
    this.stat = {
      ctime: Date.now(),
      mtime: Date.now(),
      size: 0,
    };
    this.vault = new MockVault();
  }
}

export class MockTFolder {
  path: string;
  name: string;
  children: (MockTFile | MockTFolder)[] = [];
  parent: MockTFolder | null = null;
  isRoot = jest.fn(() => this.parent === null);

  constructor(path: string) {
    this.path = path;
    const parts = path.split('/');
    this.name = parts[parts.length - 1];
  }
}

export class MockNotice {
  message: string;
  timeout: number;

  constructor(message: string, timeout?: number) {
    this.message = message;
    this.timeout = timeout || 5000;
  }

  setMessage = jest.fn();
  hide = jest.fn();
}

export class MockSetting {
  settingEl: MockHTMLElement;

  constructor(containerEl: MockHTMLElement) {
    this.settingEl = new MockHTMLElement();
  }

  setName = jest.fn(() => this);
  setDesc = jest.fn(() => this);
  addText = jest.fn(() => this);
  addTextArea = jest.fn(() => this);
  addToggle = jest.fn(() => this);
  addDropdown = jest.fn(() => this);
  addButton = jest.fn(() => this);
  addSlider = jest.fn(() => this);
  setClass = jest.fn(() => this);
  setTooltip = jest.fn(() => this);
  setDisabled = jest.fn(() => this);
  then = jest.fn((callback: (setting: MockSetting) => void) => {
    callback(this);
    return this;
  });
}

// Export a factory function to create mock instances
export function createMockApp(): MockApp {
  return new MockApp();
}

export function createMockPlugin(app?: MockApp, manifest?: any): MockPlugin {
  return new MockPlugin(app, manifest);
}

export function createMockTFile(path: string): MockTFile {
  return new MockTFile(path);
}

export function createMockTFolder(path: string): MockTFolder {
  return new MockTFolder(path);
}
