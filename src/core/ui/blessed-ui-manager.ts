import blessed from "blessed";

export class BlessedUIManager {
  private static instance: BlessedUIManager;
  public screen: blessed.Widgets.Screen;
  public outputBox: blessed.Widgets.Log;
  public inputTextBox: blessed.Widgets.TextboxElement;
  public statusBar: blessed.Widgets.BoxElement;
  private progressBar: blessed.Widgets.ProgressBarElement | null = null;
  private spinnerInterval: NodeJS.Timeout | null = null;
  private spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private spinnerFrameIndex = 0;

  private constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "FlowCoder",
      fullUnicode: true,
      dockBorders: true,
      autoNextFocus: true,
      style: {
          bg: "default",
          fg: "default"
      }
    });

    this.outputBox = (blessed as any).log({
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
      },
      style: {
        bg: "default",
        fg: "default"
      },
      border: {
        type: "line",
        fg: "cyan"
      },
      valign: "bottom"
    });

    this.inputTextBox = (blessed as any).textbox({
      parent: this.screen,
      bottom: 1,
      left: 0,
      width: "100%",
      height: 3,
      keys: true,
      mouse: false,
      inputOnFocus: true,
      border: {
          type: "line",
          fg: "magenta"
      },
      label: " {magenta-fg}flowcoder{/magenta-fg} ",
      style: {
          bg: "default",
          fg: "default",
          focus: {
              border: { fg: "white" }
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

  startSpinner(message: string) {
      this.stopSpinner();
      this.spinnerInterval = setInterval(() => {
          const frame = this.spinnerFrames[this.spinnerFrameIndex];
          this.writeStatusBar(`\${frame} \${message}`);
          this.spinnerFrameIndex = (this.spinnerFrameIndex + 1) % this.spinnerFrames.length;
      }, 80);
  }

  stopSpinner(status?: string) {
      if (this.spinnerInterval) {
          clearInterval(this.spinnerInterval);
          this.spinnerInterval = null;
      }
      if (status) {
          this.writeStatusBar(status);
      }
  }

  showProgressBar(label: string, percent: number) {
      if (!this.progressBar) {
          this.progressBar = blessed.progressbar({
              parent: this.screen,
              top: "center",
              left: "center",
              width: "50%",
              height: 3,
              border: "line",
              style: {
                  bar: { bg: "cyan" },
                  border: { fg: "white" }
              },
              label: ` \${label} `,
              filled: 0
          });
      }
      this.progressBar.setLabel(` \${label} (\${Math.round(percent)}%) `);
      this.progressBar.setProgress(percent);
      this.screen.render();
  }

  hideProgressBar() {
      if (this.progressBar) {
          this.progressBar.destroy();
          this.progressBar = null;
          this.screen.render();
      }
  }

  drawPrompt(promptText: string) {
    this.inputTextBox.focus();
    this.inputTextBox.readInput();
    this.screen.render();
  }

  async getInputPrompt(promptText: string): Promise<string> {
    const oldLabel = (this.inputTextBox as any).label;
    this.inputTextBox.setLabel(` \${promptText} `);
    this.screen.render();
    this.inputTextBox.focus();

    return new Promise((resolve) => {
        this.inputTextBox.readInput((err, value) => {
            this.inputTextBox.setValue("");
            if (oldLabel) this.inputTextBox.setLabel(oldLabel);
            this.screen.render();
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
