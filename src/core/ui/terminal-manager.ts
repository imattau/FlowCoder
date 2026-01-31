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
    private promptHeight: number = 1; 
    private statusBarHeight: number = 1;
    private commandLineHeight: number = 3; // Input line + top/bottom border

    private constructor(stream: NodeJS.WriteStream) {
        this.stream = stream;
        this.stream.on("resize", () => {
            this._rows = process.stdout.rows;
            this._columns = process.stdout.columns;
            this.updateLayoutMetrics();
            this.render(); // Redraw on resize
        });
        this.updateLayoutMetrics();
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
        return this.rows - this.statusBarHeight - this.commandLineHeight + 2; // Input line within the box
    }

    get statusBarRow(): number {
        return this.rows; // Status bar at the very bottom
    }

    private updateLayoutMetrics() {
        this.maxOutputRows = this.rows - this.promptHeight - this.statusBarHeight; 
    }

    clearScreen() {
        this.outputBuffer = [];
        this.scrollOffset = 0;
        this.stream.write("\x1b[2J");
        this.stream.write("\x1b[H");
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

        this.stream.write("\x1b[s"); // Save cursor position
        
        // Clear working area
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
        
        // Draw command line box
        const boxTopRow = this.rows - this.statusBarHeight - this.commandLineHeight + 1;
        
        this.moveCursor(1, boxTopRow);
        readline.clearLine(this.stream, 0);
        this.stream.write('┌' + '─'.repeat(this.columns - 2) + '┐');
        
        this.moveCursor(1, boxTopRow + 1); // Input line
        readline.clearLine(this.stream, 0);
        this.stream.write('│');
        this.moveCursor(this.columns, boxTopRow + 1);
        this.stream.write('│');

        this.moveCursor(1, boxTopRow + 2); // Bottom border of command line
        readline.clearLine(this.stream, 0);
        this.stream.write('└' + '─'.repeat(this.columns - 2) + '┘');
        
        // Restore cursor position for readline prompt
        this.stream.write("\x1b[u");

        this.isRendering = false;
    }

    drawPrompt(promptText: string) {
        this.stream.write("\x1b[s"); // Save cursor position
        this.moveCursor(2, this.promptRow); // Move inside the box
        readline.clearLine(this.stream, 0); // Clear the line within the box
        this.stream.write(promptText);
        this.stream.write("\x1b[u"); // Restore cursor position
    }

    writeStatusBar(text: string) {
        this.stream.write("\x1b[s"); // Save cursor
        this.moveCursor(1, this.statusBarRow);
        readline.clearLine(this.stream, 0);
        this.stream.write(text.substring(0, this.columns));
        this.stream.write("\x1b[u"); // Restore cursor
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