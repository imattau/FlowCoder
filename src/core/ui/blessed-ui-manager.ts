import blessed from "blessed";

export class BlessedUIManager {
  private static instance: BlessedUIManager;
  public screen: blessed.Widgets.Screen;
  public outputBox: blessed.Widgets.Log;
  public inputTextBox: blessed.Widgets.TextboxElement;
  public statusBar: blessed.Widgets.BoxElement;
  private promptLabel: blessed.Widgets.BoxElement;
  private inputContainer: blessed.Widgets.BoxElement;

  private constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "FlowCoder",
      fullUnicode: true,
      dockBorders: true,
      autoNextFocus: true
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
      },
      valign: "bottom"
    } as any);

    // Bounded input area (the container)
    this.inputContainer = (blessed as any).box({
        parent: this.screen,
        bottom: 1,
        left: 0,
        width: "100%",
        height: 3,
        border: { type: "line", fg: "magenta" }
    });

    this.promptLabel = (blessed as any).box({
        parent: this.inputContainer,
        top: 0,
        left: 0,
        height: 1,
        width: "shrink",
        tags: true,
        content: ""
    });

    this.inputTextBox = (blessed as any).textbox({
      parent: this.inputContainer,
      top: 0,
      left: 12, 
      height: 1,
      width: "100%-14",
      keys: true,
      mouse: false,
      inputOnFocus: true,
      style: {
        fg: "white", // Ensure text is visible
        bg: "black",
        focus: {
            fg: "white"
        }
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

    // Detect keypresses to change prompt color
    this.inputTextBox.on("keypress", (ch: string, key: any) => {
        const value = this.inputTextBox.value + (ch || "");
        if (value.startsWith("/")) {
            this.promptLabel.style.fg = "cyan";
        } else if (value.startsWith("!")) {
            this.promptLabel.style.fg = "yellow";
        } else {
            this.promptLabel.style.fg = "magenta";
        }
        this.screen.render();
    });

    // Handle Resize
    this.screen.on("resize", () => {
        this.screen.render();
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
    this.outputBox.setScrollPerc(100);
    this.screen.render();
  }

  writeStatusBar(text: string) {
    this.statusBar.setContent(text);
    this.screen.render();
  }

  drawPrompt(promptText: string) {
    const cleanPrompt = promptText.replace(/\x1b\[[0-9;]*m/g, "");
    this.promptLabel.setContent(promptText);
    this.inputTextBox.left = cleanPrompt.length;
    this.inputTextBox.width = `100%-\${cleanPrompt.length + 2}`;
    
    // Reset color to default
    this.promptLabel.style.fg = "magenta";
    
    this.inputTextBox.focus();
    this.screen.render();
  }

  async getInputPrompt(promptText: string): Promise<string> {
    const oldPrompt = this.promptLabel.content;
    const oldLeft = this.inputTextBox.left;

    this.drawPrompt(promptText);
    
    return new Promise((resolve) => {
        this.inputTextBox.readInput((err, value) => {
            this.inputTextBox.clearValue();
            this.drawPrompt(oldPrompt);
            this.inputTextBox.left = oldLeft;
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