import blessed from "blessed";

export class BlessedUIManager {
  private static instance: BlessedUIManager;
  public screen: blessed.Widgets.Screen;
  public outputBox: blessed.Widgets.Log;
  public inputTextBox: blessed.Widgets.TextboxElement;
  public statusBar: blessed.Widgets.BoxElement;
  private promptLabel: blessed.Widgets.BoxElement;

  private constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "FlowCoder",
      sendFocus: true,
      dockBorders: true,
      mouse: false
    });

    this.outputBox = blessed.log({
      parent: this.screen,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%-4",
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: " ",
        style: { bg: "cyan" }
      } as any,
      style: {
        fg: "white",
        bg: "black"
      },
      border: {
        type: "line",
        fg: "cyan"
      }
    } as any);

    // Bounded input area (the container)
    const inputContainer = (blessed as any).box({
        parent: this.screen,
        bottom: 1,
        left: 0,
        width: "100%",
        height: 3,
        border: { type: "line", fg: "magenta" }
    });

    this.promptLabel = (blessed as any).box({
        parent: inputContainer,
        top: 0,
        left: 0,
        height: 1,
        width: "shrink",
        tags: true,
        content: ""
    });

    this.inputTextBox = (blessed as any).textbox({
      parent: inputContainer,
      top: 0,
      left: 0, // Will be dynamically adjusted
      height: 1,
      width: "100%-2",
      inputOnFocus: true,
      keys: true,
      mouse: false,
      style: {
        fg: "white",
        bg: "black"
      }
    });

    this.statusBar = (blessed as any).box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: "100%",
      height: 1,
      tags: true,
      style: {
        fg: "white",
        bg: "gray"
      },
      content: "Initializing..."
    });

    this.screen.render();
  }

  static getInstance(): BlessedUIManager {
    if (!BlessedUIManager.instance) {
      BlessedUIManager.instance = new BlessedUIManager();
    }
    return BlessedUIManager.instance;
  }

  write(text: string) {
    this.outputBox.log(text);
    this.screen.render();
  }

  writeStatusBar(text: string) {
    this.statusBar.setContent(text);
    this.screen.render();
  }

  drawPrompt(promptText: string) {
    this.promptLabel.setContent(promptText);
    const cleanPrompt = promptText.replace(/\x1b\[[0-9;]*m/g, "");
    this.inputTextBox.left = cleanPrompt.length;
    this.inputTextBox.width = `100%-\${cleanPrompt.length + 2}`;
    
    this.screen.render();
    this.inputTextBox.readInput();
    this.inputTextBox.focus();
  }

  async getInputPrompt(promptText: string): Promise<string> {
    this.promptLabel.setContent(promptText);
    const cleanPrompt = promptText.replace(/\x1b\[[0-9;]*m/g, "");
    this.inputTextBox.left = cleanPrompt.length;
    
    this.screen.render();
    this.inputTextBox.focus();

    return new Promise((resolve) => {
        this.inputTextBox.readInput((err, value) => {
            this.inputTextBox.clearValue();
            resolve(value || "");
        });
    });
  }

  clearScreen() {
    this.outputBox.setContent("");
    this.screen.render();
  }

  async cleanup() {
    if (this.screen) {
        this.screen.destroy();
    }
  }
}
