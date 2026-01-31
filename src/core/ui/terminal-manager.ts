import readline from "readline";
import { Writable } from "stream";

export class TerminalManager {
    private static instance: TerminalManager;
    private stream: NodeJS.WriteStream;
    private _rows: number = process.stdout.rows;
    private _columns: number = process.stdout.columns;
    private outputBuffer: string[] = [];
    private scrollOffset: number = 0;
    private maxOutputRows: number = 0;
    private isRendering: boolean = false;
    private promptBaseHeight: number = 1; 
    private statusBarHeight: number = 1;
    private commandLineBaseHeight: number = 3; // Input line + top/bottom border
    private readlineInputBuffer: string = ""; // Buffer for readline current line
    private readlineCursorPos: number = 0; // Cursor position within readline's line
    private currentPrompt: string = ""; // Store current prompt for redraws
    private currentInputLines: number = 1; // Tracks how many lines readline input currently occupies

    private constructor(stream: NodeJS.WriteStream) {
        this.stream = stream;
        this.stream.on("resize", () => {
            this._rows = process.stdout.rows;
            this._columns = process.stdout.columns;
            this.updateLayoutMetrics();
            this.render(); // Redraw on resize
            this.drawPrompt(this.currentPrompt); // Redraw prompt after resize
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
        // Prompt starts at current total height minus status bar and actual command line height
        return this.rows - this.statusBarHeight - this.commandLineBaseHeight + (this.currentInputLines > 1 ? (this.currentInputLines -1) : 0);
    }

    get statusBarRow(): number {
        return this.rows; // Status bar at the very bottom
    }

    private updateLayoutMetrics() {
        // Max output rows = Total rows - (dynamic input lines + status bar)
        this.maxOutputRows = this.rows - this.currentInputLines - this.statusBarHeight;
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
        
        // Draw command line box (adjust position based on currentInputLines)
        const boxTopRow = this.promptRow - 1; // Top border is one line above prompt
        const boxBottomRow = this.promptRow + this.currentInputLines; // Bottom border is after all input lines
        
        // Clear and draw top border
        this.moveCursor(1, boxTopRow);
        readline.clearLine(this.stream, 0);
        this.stream.write('┌' + '─'.repeat(this.columns - 2) + '┐');
        
        // Clear and draw input lines and side borders
        for(let i = 0; i < this.currentInputLines; i++) {
            this.moveCursor(1, this.promptRow + i);
            readline.clearLine(this.stream, 0);
            this.stream.write('│');
            this.moveCursor(this.columns, this.promptRow + i);
            this.stream.write('│');
        }

        // Clear and draw bottom border
        this.moveCursor(1, boxBottomRow);
        readline.clearLine(this.stream, 0);
        this.stream.write('└' + '─'.repeat(this.columns - 2) + '┘');
        
        // Restore cursor position for readline prompt
        this.stream.write("\x1b[u");

        this.isRendering = false;
    }

    drawPrompt(promptText: string) {
        this.currentPrompt = promptText; // Store for redraws
        this.stream.write("\x1b[s"); // Save cursor position
        this.moveCursor(2, this.promptRow); // Move inside the box
        readline.clearLine(this.stream, 0); // Clear the line within the box
        this.stream.write(promptText + this.readlineInputBuffer);
        this.moveCursor(2 + promptText.length + this.readlineCursorPos, this.promptRow); // Position cursor within input
        this.stream.write("\x1b[u"); // Restore cursor position
    }

    getReadlineStream(): NodeJS.WritableStream {
        return new Writable({
            write: (chunk: Buffer, encoding: string, callback: () => void) => {
                const data = chunk.toString();
                // This is a simplified approach, a full solution needs ANSI parsing
                // Intercept cursor movements and line clearings from readline
                if (data.includes('\x1b[K') || data.includes('\x1b[2K')) { // Clear line from cursor to end, or entire line
                    this.readlineInputBuffer = "";
                    this.readlineCursorPos = 0;
                    this.drawPrompt(this.currentPrompt);
                } else if (data.includes('\x1b[C')) { // Cursor forward
                    this.readlineCursorPos++;
                } else if (data.includes('\x1b[D')) { // Cursor backward
                    this.readlineCursorPos--;
                } else {
                    // Assume it's new input or a prompt redraw from readline
                    this.readlineInputBuffer = data.replace(/\x1b\[(\d+;\d+)H/, '').replace(this.currentPrompt, ''); // Strip cursor moves and current prompt
                    this.readlineCursorPos = this.readlineInputBuffer.length; // Assume cursor is at end
                    this.drawPrompt(this.currentPrompt);
                }
                callback();
            }
        });
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

    writeStatusBar(text: string) {
        this.stream.write("\x1b[s"); // Save cursor
        this.moveCursor(1, this.statusBarRow);
        readline.clearLine(this.stream, 0);
        this.stream.write(text.substring(0, this.columns));
        this.stream.write("\x1b[u"); // Restore cursor
    }
}