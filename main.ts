import { Plugin, PluginSettingTab, Setting, MarkdownView, Notice, App } from 'obsidian';
import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';

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

const longSentenceEffect = StateEffect.define<{ from: number; to: number }>({});

const longSentenceField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(decorations, transaction) {
        decorations = decorations.map(transaction.changes);

        for (let effect of transaction.effects) {
            if (effect.is(longSentenceEffect)) {
                const { from, to } = effect.value;
                const deco = Decoration.mark({
                    class: 'long-sentence-highlight',
                }).range(from, to);
                console.log(`Creating decoration from ${from} to ${to}.`);

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

        console.log('HighlightLongTextPlugin loaded');

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
            new Notice('No active markdown file to highlight long sentences.');
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

        const content = cm6Editor.state.doc.toString();
        console.log('Document content loaded:', content);
        this.highlightLongSentences(cm6Editor);
    }

    highlightLongSentences(cm6Editor: EditorView) {
        const content = cm6Editor.state.doc.toString();
        const sentences = this.getLongSentences(content);

        console.log('Sentences to highlight:', sentences);

        const effects = [];

        let pos = 0;
        for (const line of cm6Editor.state.doc.toString().split('\n')) {
            for (const sentence of sentences) {
                const startIndex = line.indexOf(sentence);
                if (startIndex !== -1) {
                    const from = pos + startIndex;
                    const to = from + sentence.length;
                    effects.push(longSentenceEffect.of({ from, to }));
                    console.log(`Highlighting from ${from} to ${to}: ${sentence}`);
                }
            }
            pos += line.length + 1;
        }

        if (effects.length > 0) {
            console.log('Dispatching effects:', effects);
            cm6Editor.dispatch({
                effects,
            });
        } else {
            console.log('No effects to dispatch.');
        }
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