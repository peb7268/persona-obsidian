import { App, Modal, Setting, TFile, TFolder, Notice, TextComponent, ToggleComponent } from 'obsidian';
import type PersonaPlugin from '../main';
import { ExtractionResult, ExtractionOptions, DuplicateMatch, SubjectFolder } from '../types';
import { ExtractionService } from '../services/ExtractionService';

export class ExtractNoteModal extends Modal {
  private plugin: PersonaPlugin;
  private selectedText: string;
  private sourceFile: TFile;
  private extractionService: ExtractionService;

  // Form state
  private title: string = '';
  private noteType: 'note' | 'subject' = 'note';
  private targetPath: string = '';
  private tags: string[] = [];
  private enhanceWithAI: boolean = false;
  private linkToExisting: string | null = null;

  // Analysis results
  private analysisResult: ExtractionResult | null = null;

  // All subject folders (for browser)
  private allSubjectFolders: SubjectFolder[] = [];

  // UI references for dynamic updates
  private locationDisplayEl: HTMLElement | null = null;
  private folderBrowserEl: HTMLElement | null = null;

  constructor(app: App, plugin: PersonaPlugin, selectedText: string, sourceFile: TFile) {
    super(app);
    this.plugin = plugin;
    this.selectedText = selectedText;
    this.sourceFile = sourceFile;
    this.extractionService = new ExtractionService(app, plugin.settings);
    this.targetPath = plugin.settings.zettelkastenPath;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('persona-extract-modal');

    // Show loading state
    contentEl.createEl('h2', { text: 'Extract to Note' });
    const loadingEl = contentEl.createEl('p', { text: 'Analyzing content...' });

    // Analyze the content and get all subject folders in parallel
    const [analysisResult, allFolders] = await Promise.all([
      this.extractionService.analyzeContent(this.selectedText),
      this.extractionService.getDuplicateDetector().getAllSubjectFolders(),
    ]);

    this.analysisResult = analysisResult;
    this.allSubjectFolders = allFolders;

    // Set initial values from analysis
    this.title = this.analysisResult.title;
    this.noteType = this.analysisResult.suggestedType;
    this.tags = [...this.analysisResult.suggestedTags];

    // Remove loading and render form
    loadingEl.remove();
    this.renderForm(contentEl);
  }

  private renderForm(container: HTMLElement) {
    if (!this.analysisResult) return;

    // Title input
    new Setting(container)
      .setName('Title')
      .setDesc('Name for the extracted note')
      .addText((text) => {
        text
          .setPlaceholder('Note title')
          .setValue(this.title)
          .onChange((value) => {
            this.title = value;
          });
        text.inputEl.addClass('persona-extract-title-input');
      });

    // Type selection
    new Setting(container)
      .setName('Type')
      .setDesc('Atomic note or subject folder')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('note', 'Atomic Note')
          .addOption('subject', 'Subject (creates folder)')
          .setValue(this.noteType)
          .onChange((value: 'note' | 'subject') => {
            this.noteType = value;
          });
      });

    // Location browser (replaces text input)
    this.renderLocationBrowser(container);

    // Duplicate detection section
    if (this.analysisResult.duplicates.length > 0) {
      this.renderDuplicates(container, this.analysisResult.duplicates);
    }

    // Tags input
    this.renderTagsInput(container);

    // AI enhancement toggle
    new Setting(container)
      .setName('Enhance with AI')
      .setDesc('Expand and add context to the content (optional)')
      .addToggle((toggle) => {
        toggle.setValue(this.enhanceWithAI).onChange((value) => {
          this.enhanceWithAI = value;
        });
      });

    // Content preview
    this.renderContentPreview(container);

    // Action buttons
    new Setting(container)
      .addButton((btn) =>
        btn
          .setButtonText('Extract Note')
          .setCta()
          .onClick(() => this.doExtract())
      )
      .addButton((btn) =>
        btn.setButtonText('Cancel').onClick(() => this.close())
      );
  }

  private renderDuplicates(container: HTMLElement, duplicates: DuplicateMatch[]) {
    const section = container.createDiv({ cls: 'persona-extract-section persona-extract-duplicates' });
    section.createEl('h4', { text: 'Potential Duplicates Found' });

    for (const dup of duplicates.slice(0, 3)) {
      const item = section.createDiv({ cls: 'persona-extract-duplicate-item' });

      const checkbox = item.createEl('input', { type: 'checkbox' });
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.linkToExisting = dup.path;
          // Uncheck other checkboxes
          section.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            if (cb !== checkbox) (cb as HTMLInputElement).checked = false;
          });
        } else {
          this.linkToExisting = null;
        }
      });

      const label = item.createSpan({ cls: 'persona-extract-duplicate-label' });
      label.createEl('strong', { text: dup.title });
      label.createSpan({ text: ` (${dup.matchScore}% match)`, cls: 'persona-extract-match-score' });

      const hint = item.createEl('div', { cls: 'persona-extract-duplicate-hint' });
      hint.setText('Link to existing instead');
    }
  }

  /**
   * Render the location browser with breadcrumbs and folder tree
   */
  private renderLocationBrowser(container: HTMLElement) {
    const section = container.createDiv({ cls: 'persona-extract-section persona-extract-location' });
    section.createEl('h4', { text: 'Location' });

    // Breadcrumb navigation
    this.locationDisplayEl = section.createDiv({ cls: 'persona-extract-breadcrumb' });
    this.updateBreadcrumb();

    // Folder browser
    this.folderBrowserEl = section.createDiv({ cls: 'persona-extract-folder-browser' });
    this.renderFolderTree();

    // Quick actions for related subjects (if any)
    if (this.analysisResult?.relatedSubjects && this.analysisResult.relatedSubjects.length > 0) {
      const suggestedSection = section.createDiv({ cls: 'persona-extract-suggested' });
      suggestedSection.createEl('div', {
        text: 'Suggested:',
        cls: 'persona-extract-suggested-label'
      });

      const suggestedList = suggestedSection.createDiv({ cls: 'persona-extract-suggested-list' });
      for (const subjectPath of this.analysisResult.relatedSubjects.slice(0, 3)) {
        const folderName = subjectPath.split('/').pop() || subjectPath;
        const btn = suggestedList.createEl('button', {
          text: folderName,
          cls: 'persona-extract-suggested-btn',
        });
        btn.addEventListener('click', () => {
          this.selectFolder(subjectPath);
        });
      }
    }
  }

  /**
   * Update the breadcrumb display
   */
  private updateBreadcrumb() {
    if (!this.locationDisplayEl) return;
    this.locationDisplayEl.empty();

    const zettelPath = this.plugin.settings.zettelkastenPath;
    const parts = this.targetPath.split('/');

    // Build breadcrumb parts
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = i === 0 ? part : `${currentPath}/${part}`;
      const pathSnapshot = currentPath;

      if (i > 0) {
        this.locationDisplayEl.createSpan({ text: ' / ', cls: 'persona-extract-breadcrumb-sep' });
      }

      const crumb = this.locationDisplayEl.createSpan({
        text: part,
        cls: 'persona-extract-breadcrumb-part',
      });

      // Make clickable to navigate up
      crumb.addEventListener('click', () => {
        this.selectFolder(pathSnapshot);
      });
    }

    // Show "new folder" indicator if creating a subject
    if (this.noteType === 'subject' && this.title) {
      this.locationDisplayEl.createSpan({ text: ' / ', cls: 'persona-extract-breadcrumb-sep' });
      this.locationDisplayEl.createSpan({
        text: `📁 ${this.title}`,
        cls: 'persona-extract-breadcrumb-new',
      });
    }
  }

  /**
   * Render the folder tree for the current path
   */
  private renderFolderTree() {
    if (!this.folderBrowserEl) return;
    this.folderBrowserEl.empty();

    const zettelPath = this.plugin.settings.zettelkastenPath;

    // Get direct children of current path
    const currentFolder = this.app.vault.getAbstractFileByPath(this.targetPath);
    if (!currentFolder || !(currentFolder instanceof TFolder)) {
      this.folderBrowserEl.createEl('div', {
        text: 'Folder not found. It will be created.',
        cls: 'persona-extract-folder-empty',
      });
      return;
    }

    // Collect subfolders
    const subfolders: { name: string; path: string; noteCount: number; hasIndex: boolean }[] = [];
    for (const child of currentFolder.children) {
      if (child instanceof TFolder) {
        const folderInfo = this.allSubjectFolders.find(f => f.path === child.path);
        subfolders.push({
          name: child.name,
          path: child.path,
          noteCount: folderInfo?.noteCount || 0,
          hasIndex: folderInfo?.hasIndex || false,
        });
      }
    }

    // Sort alphabetically
    subfolders.sort((a, b) => a.name.localeCompare(b.name));

    if (subfolders.length === 0) {
      this.folderBrowserEl.createEl('div', {
        text: 'No subfolders. Note will be created here.',
        cls: 'persona-extract-folder-empty',
      });
      return;
    }

    // Render folder items
    for (const folder of subfolders) {
      const item = this.folderBrowserEl.createDiv({ cls: 'persona-extract-folder-item' });

      // Folder icon and name
      const folderBtn = item.createEl('button', {
        cls: 'persona-extract-folder-btn',
      });

      folderBtn.createSpan({ text: '📁', cls: 'persona-extract-folder-icon' });
      folderBtn.createSpan({ text: folder.name, cls: 'persona-extract-folder-name' });

      // Note count badge
      if (folder.noteCount > 0) {
        folderBtn.createSpan({
          text: `${folder.noteCount}`,
          cls: 'persona-extract-folder-count',
        });
      }

      // Click to drill down
      folderBtn.addEventListener('click', () => {
        this.selectFolder(folder.path);
      });

      // "Use this folder" button
      const useBtn = item.createEl('button', {
        text: 'Use',
        cls: 'persona-extract-folder-use',
      });
      useBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.targetPath = folder.path;
        this.updateBreadcrumb();
        new Notice(`Target: ${folder.name}`);
      });
    }

    // "Go up" button if not at root
    if (this.targetPath !== zettelPath) {
      const upBtn = this.folderBrowserEl.createEl('button', {
        text: '⬆️ Parent folder',
        cls: 'persona-extract-folder-up',
      });
      upBtn.addEventListener('click', () => {
        const parentPath = this.targetPath.split('/').slice(0, -1).join('/') || zettelPath;
        this.selectFolder(parentPath);
      });
    }
  }

  /**
   * Select a folder and update the UI
   */
  private selectFolder(path: string) {
    this.targetPath = path;
    this.updateBreadcrumb();
    this.renderFolderTree();
  }

  private renderTagsInput(container: HTMLElement) {
    const section = container.createDiv({ cls: 'persona-extract-section' });
    section.createEl('h4', { text: 'Tags' });

    const tagsContainer = section.createDiv({ cls: 'persona-extract-tags' });

    // Render existing tags
    const renderTags = () => {
      tagsContainer.empty();
      for (const tag of this.tags) {
        const tagEl = tagsContainer.createSpan({ cls: 'persona-extract-tag' });
        tagEl.createSpan({ text: tag });
        const removeBtn = tagEl.createSpan({ text: '×', cls: 'persona-extract-tag-remove' });
        removeBtn.addEventListener('click', () => {
          this.tags = this.tags.filter((t) => t !== tag);
          renderTags();
        });
      }

      // Add tag input
      const addTagBtn = tagsContainer.createEl('button', {
        text: '+ Add',
        cls: 'persona-extract-add-tag',
      });
      addTagBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'persona-extract-tag-input';
        input.placeholder = 'tag name';
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && input.value.trim()) {
            this.tags.push(input.value.trim().replace(/^#/, ''));
            renderTags();
          } else if (e.key === 'Escape') {
            renderTags();
          }
        });
        input.addEventListener('blur', () => {
          if (input.value.trim()) {
            this.tags.push(input.value.trim().replace(/^#/, ''));
          }
          renderTags();
        });
        addTagBtn.replaceWith(input);
        input.focus();
      });
    };

    renderTags();
  }

  private renderContentPreview(container: HTMLElement) {
    const section = container.createDiv({ cls: 'persona-extract-section' });
    section.createEl('h4', { text: 'Content Preview' });

    const preview = section.createDiv({ cls: 'persona-extract-preview' });
    const previewText = this.selectedText.length > 200
      ? this.selectedText.slice(0, 200) + '...'
      : this.selectedText;
    preview.createEl('pre', { text: previewText });
  }

  private async doExtract() {
    if (!this.title.trim()) {
      new Notice('Please enter a title');
      return;
    }

    const options: ExtractionOptions = {
      title: this.title,
      content: this.selectedText,
      type: this.noteType,
      targetPath: this.targetPath,
      tags: this.tags,
      sourceFile: this.sourceFile.basename,
      enhanceWithAI: this.enhanceWithAI,
      linkToExisting: this.linkToExisting || undefined,
    };

    const result = await this.extractionService.extractToNote(options);

    if (result) {
      // Replace selected text with link
      const linkTitle = this.linkToExisting ? result.basename : this.title;
      const linkPath = result.path.replace('.md', '');

      await this.extractionService.replaceWithLink(
        this.sourceFile,
        this.selectedText,
        linkPath,
        linkTitle
      );

      new Notice(`Extracted to: ${result.basename}`);
      this.close();
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
