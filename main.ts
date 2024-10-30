import { Plugin, PluginSettingTab, Setting, MarkdownView, Notice, App } from 'obsidian';
import { EditorView } from '@codemirror/view';

interface MyPluginSettings {
    maxWords: number;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    maxWords: 10,
};

class HighlightLongTextSettingTab extends PluginSettingTab {
    plugin: HighlightLongTextPlugin;

    constructor(app: App, plugin: HighlightLongTextPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Highlight Long Sentences Settings' });

        new Setting(containerEl)
            .setName('Maximum Words')
            .setDesc('Set the maximum word count for highlighting sentences')
            .addText((text) =>
                text.setValue(String(this.plugin.settings.maxWords)).onChange(async (value) => {
                    const newValue = parseInt(value);
                    if (!isNaN(newValue) && newValue > 0) {
                        this.plugin.settings.maxWords = newValue;
                        await this.plugin.saveSettings();
                        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                        if (activeView) {
                            await this.plugin.highlightView(activeView);
                        }
                    }
                    console.log('Setting updated to maxWords:', newValue);
                })
            );
    }
}

export default class HighlightLongTextPlugin extends Plugin {
    settings: MyPluginSettings = DEFAULT_SETTINGS;

    async onload() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadSettings());
        this.addSettingTab(new HighlightLongTextSettingTab(this.app, this));

        this.addCommand({
            id: 'highlight-long-sentences',
            name: 'Highlight Long Sentences',
            callback: () => this.highlightCurrentView(),
        });

        console.log('HighlightLongTextPlugin loaded');

        this.app.workspace.on('file-open', this.highlightCurrentView.bind(this));
        this.app.workspace.on('layout-change', this.highlightCurrentView.bind(this));
    }

    async highlightCurrentView() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            await this.highlightView(activeView);
        } else {
            new Notice('No active markdown file to log long sentences.');
            console.log('No active markdown file to log long sentences.');
        }
    }

    async highlightView(view: MarkdownView) {
        const cm6Editor: EditorView = (view.editor as any).cm as EditorView;

        if (!cm6Editor) {
            new Notice('Failed to access the CodeMirror editor.');
            console.log('Failed to access the CodeMirror editor.');
            return;
        }

        this.logLongSentences(cm6Editor);
    }

    logLongSentences(cm6Editor: EditorView) {
        const content = cm6Editor.state.doc.toString();
        const sentences = this.getLongSentences(content);


        let startIndex = 0;
        const lines = content.split('\n');

        lines.forEach((line: string, lineNumber: number) => {
            sentences.forEach((sentence) => {
                const sentenceStart = line.indexOf(sentence);
                if (sentenceStart !== -1) {
                    console.log(`Line: ${lineNumber + 1}, Start index: ${sentenceStart}: ${sentence}`);
                }
            });
            startIndex += line.length + 1;
        });
    }

    getLongSentences(content: string): string[] {
        const sentences = content.split(/(?<=[.!?])\s+/);
        return sentences.filter((sentence) => sentence.split(/\s+/).length > this.settings.maxWords);
    }

    async loadSettings(): Promise<MyPluginSettings> {
        const data = await this.loadData();
        return Object.assign({}, DEFAULT_SETTINGS, data);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}