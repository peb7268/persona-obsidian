/**
 * Manual mock for the 'obsidian' module
 * This allows Jest to run tests without the actual Obsidian app
 */

// Re-export all our mock implementations including TFile, TFolder, TAbstractFile
// These are proper classes that MockTFile/MockTFolder extend
export * from '../src/__tests__/mocks/obsidian';

// Export commonly used Obsidian classes as jest mocks
// Note: Menu is exported from mocks/obsidian.ts as MockMenu with full implementation
export const App = jest.fn();
export const Plugin = jest.fn();
export const PluginSettingTab = jest.fn();
export const Modal = jest.fn();
export const Notice = jest.fn();
export const Setting = jest.fn();
export const Vault = jest.fn();
export const Workspace = jest.fn();
export const MetadataCache = jest.fn();
export const FileSystemAdapter = jest.fn();
export const MarkdownView = jest.fn();
export const MarkdownRenderer = jest.fn();
export const Component = jest.fn();
export const Events = jest.fn();
// Menu and MenuItem are exported from mocks/obsidian.ts with full implementation
export const Keymap = jest.fn();
export const Scope = jest.fn();
export const FuzzySuggestModal = jest.fn();
export const SuggestModal = jest.fn();
export const TextComponent = jest.fn();
export const TextAreaComponent = jest.fn();
export const ToggleComponent = jest.fn();
export const DropdownComponent = jest.fn();
export const ButtonComponent = jest.fn();
export const SliderComponent = jest.fn();
export const MomentFormatComponent = jest.fn();
export const ExtraButtonComponent = jest.fn();
export const ColorComponent = jest.fn();
export const SearchComponent = jest.fn();
export const ValueComponent = jest.fn();

// Utility functions
export const setIcon = jest.fn();
