import { Plugin, PluginSettingTab, Setting, App, MarkdownView, Notice } from 'obsidian';

interface MyPluginSettings {
    maxLength: number;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    maxLength: 100,
};

export default class HighlightLongTextPlugin extends Plugin {
    settings: MyPluginSettings = DEFAULT_SETTINGS; // Initialize this without assigning a value in the constructor

    async onload() {
        this.settings = await this.loadSettings();
        this.addSettingTab(new HighlightLongTextSettingTab(this.app, this));

        this.addCommand({
            id: 'highlight-long-text',
            name: 'Highlight Long Text',
            callback: () => this.highlightText(),
        });
    }

    async highlightText() {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            const content = await this.app.vault.read(activeFile);
            const highlightedContent = this.highlightLongText(content);
            await this.app.vault.modify(activeFile, highlightedContent);
            new Notice("Highlighted text longer than " + this.settings.maxLength + " characters.");
        }
    }

    highlightLongText(content: string): string {
        const lines = content.split('\n');
        return lines.map(line => {
            return line.length > this.settings.maxLength ? `==${line}==` : line; // Highlight with '==' markers
        }).join('\n');
    }

    async loadSettings() {
        const data = await this.loadData();
        return { ...DEFAULT_SETTINGS, ...(data as MyPluginSettings) };
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class HighlightLongTextSettingTab extends PluginSettingTab {
    private plugin: HighlightLongTextPlugin;

    constructor(app: App, plugin: HighlightLongTextPlugin) {
        super(app, plugin); // Ensure the super call is correct
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this; // This is now valid as it's defined in PluginSettingTab

        containerEl.empty();
        containerEl.createEl('h2', { text: 'Highlight Long Text Settings' });

        new Setting(containerEl)
            .setName('Maximum Length')
            .setDesc('Set the maximum character length for highlighting')
            .addText(text =>
                text.setValue(this.plugin.settings.maxLength.toString())
                .onChange(async (value) => {
                    const newValue = parseInt(value);
                    if (!isNaN(newValue) && newValue > 0) {
                        this.plugin.settings.maxLength = newValue; // Accessible because `plugin` is of the correct type
                        await this.plugin.saveSettings();
                    }
                })
            );
    }
}
