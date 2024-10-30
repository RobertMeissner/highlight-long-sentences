import {Plugin, PluginSettingTab, Setting, MarkdownView, Notice, App} from 'obsidian';
import {EditorView, Decoration, DecorationSet} from '@codemirror/view';
import {StateEffect, StateField} from '@codemirror/state';

interface MyPluginSettings {
    maxWords: number;
    highlightColor: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    maxWords: 10,
    highlightColor: 'rgba(255, 182, 193, 0.5)', // Default light pink color
};

class HighlightLongTextSettingTab extends PluginSettingTab {
    plugin: HighlightLongTextPlugin;

    constructor(app: App, plugin: HighlightLongTextPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.createEl('h2', {text: 'Highlight Long Sentences Settings'});

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
                })
            );

        new Setting(containerEl)
            .setName('Highlight Color')
            .setDesc('Set the background color for highlighted sentences')
            .addColorPicker((colorPicker) =>
                colorPicker.setValue(this.plugin.settings.highlightColor).onChange(async (value) => {
                    this.plugin.settings.highlightColor = value;
                    await this.plugin.saveSettings();
                    const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                    if (activeView) {
                        await this.plugin.highlightView(activeView);
                    }
                })
            );
    }
}

const addHighlightEffect = StateEffect.define<{ from: number; to: number }>({});
const clearHighlightsEffect = StateEffect.define<void>({});

const longSentenceField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(decorations, transaction) {
        decorations = decorations.map(transaction.changes);

        for (let effect of transaction.effects) {
            if (effect.is(clearHighlightsEffect)) {
                decorations = Decoration.none;
            }
            if (effect.is(addHighlightEffect)) {
                const {from, to} = effect.value;
                const deco = Decoration.mark({
                    class: 'long-sentence-highlight',
                }).range(from, to);
                decorations = decorations.update({
                    add: [deco],
                });
            }
        }
        return decorations;
    },
    provide: (field) => EditorView.decorations.from(field),
});

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

        this.registerEditorExtension([longSentenceField]);

        this.app.workspace.on('file-open', this.highlightCurrentView.bind(this));
        this.app.workspace.on('layout-change', this.highlightCurrentView.bind(this));
    }

    onunload() {
        console.log('HighlightLongTextPlugin unloaded');
    }

    async highlightCurrentView() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            await this.highlightView(activeView);
        } else {
            console.log('No active markdown file to highlight long sentences.');
        }
    }

    async highlightView(view: MarkdownView) {
        const cm6Editor: EditorView = (view.editor as any).cm as EditorView;

        if (!cm6Editor) {
            new Notice('Failed to access the CodeMirror editor.');
            console.log('Failed to access the CodeMirror editor.');
            return;
        }

        this.applyCustomCSS();

        const content = cm6Editor.state.doc.toString();
        this.highlightLongSentences(cm6Editor);
    }

    highlightLongSentences(cm6Editor: EditorView) {
        const content = cm6Editor.state.doc.toString();
        const sentences = this.getLongSentences(content);


        const effects: StateEffect<any>[] = [clearHighlightsEffect.of(undefined)];

        let startIndex = 0;
        for (const sentence of sentences) {
            startIndex = content.indexOf(sentence, startIndex);
            if (startIndex !== -1) {
                const from = startIndex;
                const to = from + sentence.length;
                effects.push(addHighlightEffect.of({from, to}));
                startIndex = to;
            } else {
                console.log(`Could not find sentence: ${sentence}`);
            }
        }

        if (effects.length > 1) {
            cm6Editor.dispatch({effects});
        }
    }

    getLongSentences(content: string): string[] {

        const sentenceDelimiterRegex = /(?<=[.!?])\s+|(?=\n\n)|(?=\n\s*\n)|(?<!\n)\n(?!\n)/;
        const sentences = content.split(sentenceDelimiterRegex);

        return sentences.filter((sentence) => sentence.split(/\s+/).length > this.settings.maxWords);
    }

    applyCustomCSS() {
        const style = document.createElement('style');
        style.textContent = `
            .cm-line .long-sentence-highlight {
                background-color: ${this.settings.highlightColor};
            }
        `;
        document.head.append(style);
    }

    async loadSettings(): Promise<MyPluginSettings> {
        const data = await this.loadData();
        return Object.assign({}, DEFAULT_SETTINGS, data);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}