"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const DEFAULT_SETTINGS = {
    maxWords: 10,
};
class HighlightLongTextSettingTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Highlight Long Sentences Settings' });
        new obsidian_1.Setting(containerEl)
            .setName('Maximum Words')
            .setDesc('Set the maximum word count for highlighting sentences')
            .addText((text) => text.setValue(String(this.plugin.settings.maxWords)).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            const newValue = parseInt(value);
            if (!isNaN(newValue) && newValue > 0) {
                this.plugin.settings.maxWords = newValue;
                yield this.plugin.saveSettings();
                const activeView = this.plugin.app.workspace.getActiveViewOfType(obsidian_1.MarkdownView);
                if (activeView) {
                    yield this.plugin.highlightView(activeView);
                }
            }
            console.log('Setting updated to maxWords:', newValue);
        })));
    }
}
class HighlightLongTextPlugin extends obsidian_1.Plugin {
    constructor() {
        super(...arguments);
        this.settings = DEFAULT_SETTINGS;
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadSettings());
            this.addSettingTab(new HighlightLongTextSettingTab(this.app, this));
            this.addCommand({
                id: 'highlight-long-sentences',
                name: 'Highlight Long Sentences',
                callback: () => this.highlightCurrentView(),
            });
            console.log('HighlightLongTextPlugin loaded');
            this.app.workspace.on('file-open', this.highlightCurrentView.bind(this));
            this.app.workspace.on('layout-change', this.highlightCurrentView.bind(this));
        });
    }
    highlightCurrentView() {
        return __awaiter(this, void 0, void 0, function* () {
            const activeView = this.app.workspace.getActiveViewOfType(obsidian_1.MarkdownView);
            if (activeView) {
                yield this.highlightView(activeView);
            }
            else {
                new obsidian_1.Notice('No active markdown file to log long sentences.');
                console.log('No active markdown file to log long sentences.');
            }
        });
    }
    highlightView(view) {
        return __awaiter(this, void 0, void 0, function* () {
            const cm6Editor = view.editor.cm;
            if (!cm6Editor) {
                new obsidian_1.Notice('Failed to access the CodeMirror editor.');
                console.log('Failed to access the CodeMirror editor.');
                return;
            }
            this.logLongSentences(cm6Editor);
        });
    }
    logLongSentences(cm6Editor) {
        const content = cm6Editor.state.doc.toString();
        const sentences = this.getLongSentences(content);
        let startIndex = 0;
        const lines = content.split('\n');
        lines.forEach((line, lineNumber) => {
            sentences.forEach((sentence) => {
                const sentenceStart = line.indexOf(sentence);
                if (sentenceStart !== -1) {
                    console.log(`Line: ${lineNumber + 1}, Start index: ${sentenceStart}: ${sentence}`);
                }
            });
            startIndex += line.length + 1;
        });
    }
    getLongSentences(content) {
        const sentences = content.split(/(?<=[.!?])\s+/);
        return sentences.filter((sentence) => sentence.split(/\s+/).length > this.settings.maxWords);
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.loadData();
            return Object.assign({}, DEFAULT_SETTINGS, data);
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
}
exports.default = HighlightLongTextPlugin;
