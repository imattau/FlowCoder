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
      autoNextFocus: true,
      // Use 'default' to inherit terminal background/foreground
      style: {
          bg: "default",
          fg: "default"
      }
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
        bg: "default",
        fg: "default"
      },
      border: {
        type: "line",
        fg: "cyan"
      },
      valign: "bottom"
    } as any);

    // Bounded input area
    this.inputContainer = (blessed as any).box({
        parent: this.screen,
        bottom: 1,
        left: 0,
        width: "100%",
        height: 3,
        style: {
            bg: "default",
            fg: "default"
        },
        border: { type: "line", fg: "magenta" }
    });

    this.promptLabel = (blessed as any).box({
        parent: this.inputContainer,
        top: 0,
        left: 0,
        height: 1,
        width: "shrink",
        tags: true,
        style: {
            bg: "default",
            fg: "magenta" // Keep prompt color
        },
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
      cursor: {
          artificial: true,
          shape: 'block',
          blink: true,
          color: 'default'
      },
      style: {
          bg: "default",
          fg: "default",
          focus: {
              bg: "default",
              fg: "default"
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
        inverse: true 
      },
      content: "Initializing..."
    });

    // Detect keypresses to change prompt color
    this.inputTextBox.on("keypress", () => {
        const value = this.inputTextBox.value || "";
        if (value.startsWith("/")) {
            this.promptLabel.style.fg = "cyan";
        } else if (value.startsWith("!")) {
            this.promptLabel.style.fg = "yellow";
        } else {
            this.promptLabel.style.fg = "magenta";
        }
        this.screen.render();
    });

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
    
    this.promptLabel.style.fg = "magenta";
    
    this.inputTextBox.focus();
    this.inputTextBox.readInput(); 
    this.screen.render();
  }

  async getInputPrompt(promptText: string): Promise<string> {
    const oldPrompt = this.promptLabel.content;
    
    this.promptLabel.setContent(promptText);
    const cleanPrompt = promptText.replace(/\x1b\[[0-9;]*m/g, "");
    this.inputTextBox.left = cleanPrompt.length;
    
    this.inputTextBox.focus();
    this.screen.render();

    return new Promise((resolve) => {
        this.inputTextBox.readInput((err, value) => {
            this.inputTextBox.clearValue();
            this.drawPrompt(oldPrompt);
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
