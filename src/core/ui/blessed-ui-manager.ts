import blessed from "blessed";

export class BlessedUIManager {
  private static instance: BlessedUIManager;
  public screen: blessed.Widgets.Screen;
  public outputBox: blessed.Widgets.Log;
  public inputTextBox: blessed.Widgets.TextboxElement;
  public statusBar: blessed.Widgets.BoxElement;
  private currentPrompt: string = "";

  private constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "FlowCoder",
      sendFocus: true,
      dockBorders: true
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

    this.inputTextBox = blessed.textbox({
      parent: this.screen,
      bottom: 2,
      left: 0,
      width: "100%",
      height: 3,
      inputOnFocus: true,
      keys: true,
      mouse: true,
      style: {
        fg: "white",
        bg: "black",
        border: {
          fg: "magenta"
        }
      },
      border: {
        type: "line"
      }
    } as any);

    this.statusBar = blessed.box({
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
    } as any);

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
    this.currentPrompt = promptText;
    this.inputTextBox.readInput();
    this.inputTextBox.setContent(promptText + this.inputTextBox.value);
    this.screen.render();
    this.inputTextBox.focus();
  }

  async getInputPrompt(promptText: string): Promise<string> {
    this.inputTextBox.setContent(promptText);
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