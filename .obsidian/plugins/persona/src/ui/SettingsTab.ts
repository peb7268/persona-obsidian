import { App, PluginSettingTab, Setting } from 'obsidian';
import type PersonaPlugin from '../main';
import { ProviderType } from '../providers/types';

export class PersonaSettingTab extends PluginSettingTab {
  plugin: PersonaPlugin;

  constructor(app: App, plugin: PersonaPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Persona Settings' });

    new Setting(containerEl)
      .setName('Persona root path')
      .setDesc('Path to the Persona project directory')
      .addText((text) =>
        text
          .setPlaceholder('/path/to/Persona')
          .setValue(this.plugin.settings.personaRoot)
          .onChange(async (value) => {
            this.plugin.settings.personaRoot = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Business instance')
      .setDesc('Which business instance to use (e.g., MHM)')
      .addText((text) =>
        text
          .setPlaceholder('MHM')
          .setValue(this.plugin.settings.business)
          .onChange(async (value) => {
            this.plugin.settings.business = value;
            await this.plugin.saveSettings();
            if (this.plugin.statusBar) {
              this.plugin.statusBar.updateBusiness(value);
            }
          })
      );

    new Setting(containerEl)
      .setName('Show ribbon icon')
      .setDesc('Show the Persona icon in the left ribbon')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRibbonIcon)
          .onChange(async (value) => {
            this.plugin.settings.showRibbonIcon = value;
            await this.plugin.saveSettings();
            this.plugin.updateRibbonIcon();
          })
      );

    new Setting(containerEl)
      .setName('Show status bar')
      .setDesc('Show Persona status in the status bar')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showStatusBar)
          .onChange(async (value) => {
            this.plugin.settings.showStatusBar = value;
            await this.plugin.saveSettings();
            this.plugin.updateStatusBar();
          })
      );

    // Auto-processing section
    containerEl.createEl('h3', { text: 'Auto-Processing' });

    new Setting(containerEl)
      .setName('Process on file save')
      .setDesc('Automatically process research questions when daily note is saved')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoProcessOnSave)
          .onChange(async (value) => {
            this.plugin.settings.autoProcessOnSave = value;
            await this.plugin.saveSettings();
            this.plugin.updateFileWatcher();
          })
      );

    new Setting(containerEl)
      .setName('Enable polling')
      .setDesc('Periodically check for new research questions')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.pollingEnabled)
          .onChange(async (value) => {
            this.plugin.settings.pollingEnabled = value;
            await this.plugin.saveSettings();
            this.plugin.updatePolling();
          })
      );

    new Setting(containerEl)
      .setName('Polling interval')
      .setDesc('How often to check for new questions (minutes)')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('5', '5 minutes')
          .addOption('10', '10 minutes')
          .addOption('15', '15 minutes')
          .addOption('30', '30 minutes')
          .addOption('60', '1 hour')
          .setValue(String(this.plugin.settings.pollingIntervalMinutes))
          .onChange(async (value) => {
            this.plugin.settings.pollingIntervalMinutes = parseInt(value);
            await this.plugin.saveSettings();
            this.plugin.updatePolling();
          })
      );

    // AI Providers section (Phase 2.5)
    containerEl.createEl('h3', { text: 'AI Providers' });

    new Setting(containerEl)
      .setName('Default provider')
      .setDesc('The AI provider to use when not specified by agent')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('claude', 'Claude Code CLI')
          .addOption('gemini', 'Gemini CLI')
          .addOption('jules', 'Jules Tools CLI')
          .setValue(this.plugin.settings.defaultProvider)
          .onChange(async (value) => {
            this.plugin.settings.defaultProvider = value as ProviderType;
            await this.plugin.saveSettings();
            this.plugin.executionService?.reinitializeProviders();
          })
      );

    // Claude provider settings
    containerEl.createEl('h4', { text: 'Claude Code CLI' });

    new Setting(containerEl)
      .setName('Enable Claude')
      .setDesc('Use Claude Code CLI for agent execution')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.providers.claude.enabled)
          .onChange(async (value) => {
            this.plugin.settings.providers.claude.enabled = value;
            await this.plugin.saveSettings();
            this.plugin.executionService?.reinitializeProviders();
          })
      );

    new Setting(containerEl)
      .setName('Claude executable path')
      .setDesc('Path to the Claude CLI executable')
      .addText((text) =>
        text
          .setPlaceholder('claude')
          .setValue(this.plugin.settings.providers.claude.path)
          .onChange(async (value) => {
            this.plugin.settings.providers.claude.path = value;
            await this.plugin.saveSettings();
            this.plugin.executionService?.reinitializeProviders();
          })
      );

    // Gemini provider settings
    containerEl.createEl('h4', { text: 'Gemini CLI' });

    new Setting(containerEl)
      .setName('Enable Gemini')
      .setDesc('Use Gemini CLI for agent execution')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.providers.gemini.enabled)
          .onChange(async (value) => {
            this.plugin.settings.providers.gemini.enabled = value;
            await this.plugin.saveSettings();
            this.plugin.executionService?.reinitializeProviders();
          })
      );

    new Setting(containerEl)
      .setName('Gemini executable path')
      .setDesc('Path to the Gemini CLI executable')
      .addText((text) =>
        text
          .setPlaceholder('gemini')
          .setValue(this.plugin.settings.providers.gemini.path)
          .onChange(async (value) => {
            this.plugin.settings.providers.gemini.path = value;
            await this.plugin.saveSettings();
            this.plugin.executionService?.reinitializeProviders();
          })
      );

    // Jules provider settings
    containerEl.createEl('h4', { text: 'Jules Tools CLI' });

    new Setting(containerEl)
      .setName('Enable Jules')
      .setDesc('Use Jules Tools CLI for async task creation')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.providers.jules.enabled)
          .onChange(async (value) => {
            this.plugin.settings.providers.jules.enabled = value;
            await this.plugin.saveSettings();
            this.plugin.executionService?.reinitializeProviders();
          })
      );

    new Setting(containerEl)
      .setName('Jules executable path')
      .setDesc('Path to the Jules CLI executable')
      .addText((text) =>
        text
          .setPlaceholder('jules')
          .setValue(this.plugin.settings.providers.jules.path)
          .onChange(async (value) => {
            this.plugin.settings.providers.jules.path = value;
            await this.plugin.saveSettings();
            this.plugin.executionService?.reinitializeProviders();
          })
      );
  }
}
