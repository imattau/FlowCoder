import readline from "readline";

export class TerminalManager {
    private static instance: TerminalManager;
    private stream: NodeJS.WriteStream;
    private _rows: number = process.stdout.rows;
    private _columns: number = process.stdout.columns;
    private outputBuffer: string[] = [];
    private scrollOffset: number = 0;
    private maxOutputRows: number = 0;
    private isRendering: boolean = false;
    private promptHeight: number = 1; // Number of lines the prompt takes

    private constructor(stream: NodeJS.WriteStream) {
        this.stream = stream;
        this.stream.on("resize", () => {
            this._rows = process.stdout.rows;
            this._columns = process.stdout.columns;
            this.updateMaxOutputRows();
            this.render(); // Redraw on resize
        });
        this.updateMaxOutputRows();
    }

    static getInstance(stream: NodeJS.WriteStream = process.stdout): TerminalManager {
        if (!TerminalManager.instance) {
            TerminalManager.instance = new TerminalManager(stream);
        }
        return TerminalManager.instance;
    }

    get rows(): number { return this._rows; }
    get columns(): number { return this._columns; }

    get promptRow(): number {
        return this.rows - this.promptHeight + 1; // 1-based row for the prompt start
    }

    private updateMaxOutputRows() {
        this.maxOutputRows = this.rows - this.promptHeight; 
    }

    clearScreen() {
        this.outputBuffer = [];
        this.scrollOffset = 0;
        this.stream.write("\x1b[2J"); // Clear screen
        this.stream.write("\x1b[H");  // Move cursor to home (0,0)
    }

    moveCursor(x: number, y: number) {
        this.stream.write(`\x1b[${y};${x}H`);
    }

    write(text: string) {
        this.outputBuffer.push(...text.split("\n"));
        const maxBufferSize = this.maxOutputRows * 2;
        if (this.outputBuffer.length > maxBufferSize) {
            this.outputBuffer = this.outputBuffer.slice(this.outputBuffer.length - maxBufferSize);
        }
        this.scrollOffset = Math.max(0, this.outputBuffer.length - this.maxOutputRows);
        this.render();
    }
    
    render() {
        if (this.isRendering) return;
        this.isRendering = true;

        // Save cursor position
        this.stream.write("\x1b[s"); 
        
        // Clear working area (above prompt)
        for (let i = 1; i <= this.maxOutputRows; i++) {
            this.moveCursor(1, i);
            readline.clearLine(this.stream, 0);
        }

        // Write buffered content
        const startIndex = Math.max(0, this.outputBuffer.length - this.maxOutputRows);
        const endIndex = this.outputBuffer.length;

        for (let i = startIndex; i < endIndex; i++) {
            const line = this.outputBuffer[i];
            if (line !== undefined) {
                this.moveCursor(1, i - startIndex + 1);
                this.stream.write(line.substring(0, this.columns));
            }
        }
        
        // Draw the horizontal line above the prompt
        this.moveCursor(1, this.promptRow - 1);
        readline.clearLine(this.stream, 0);
        this.stream.write('─'.repeat(this.columns));
        
        // Restore cursor position for readline prompt
        this.stream.write("\x1b[u");

        this.isRendering = false;
    }
    
    hideCursor() {
        this.stream.write("\x1b[?25l");
    }

    showCursor() {
        this.stream.write("\x1b[?25h");
    }

    scrollOutputUp() {
        if (this.scrollOffset > 0) {
            this.scrollOffset--;
            this.render();
        }
    }

    scrollOutputDown() {
        if (this.scrollOffset < this.outputBuffer.length - this.maxOutputRows) {
            this.scrollOffset++;
            this.render();
        }
    }
}
