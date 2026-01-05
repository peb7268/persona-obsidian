import { App, Modal } from 'obsidian';

export class LogViewerModal extends Modal {
  title: string;
  content: string;

  constructor(app: App, title: string, content: string) {
    super(app);
    this.title = title;
    this.content = content;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('persona-log-modal');

    contentEl.createEl('h2', { text: this.title });

    const logContainer = contentEl.createDiv({ cls: 'persona-log-viewer' });
    const pre = logContainer.createEl('pre', { text: this.content || 'No log content available.' });

    // Auto-scroll to bottom after render
    setTimeout(() => {
      logContainer.scrollTop = logContainer.scrollHeight;
    }, 0);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
