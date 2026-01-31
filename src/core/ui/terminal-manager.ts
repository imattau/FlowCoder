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

    /**
     * The row where the command prompt should start. (1-based)
     */
    get promptRow(): number {
        return this.rows;
    }

    private updateMaxOutputRows() {
        // Reserve 1 row for the prompt
        this.maxOutputRows = this.rows - 1; 
    }

    /**
     * Clear the entire terminal screen and reset the buffer.
     */
    clearScreen() {
        this.outputBuffer = [];
        this.scrollOffset = 0;
        this.stream.write("\x1b[2J"); // Clear screen
        this.stream.write("\x1b[H");  // Move cursor to home (0,0)
    }

    /**
     * Move cursor to a specific position.
     * @param x 1-based column
     * @param y 1-based row
     */
    moveCursor(x: number, y: number) {
        this.stream.write(`\x1b[${y};${x}H`);
    }

    /**
     * Add text to the scrollable output buffer.
     * @param text The text to add.
     */
    write(text: string) {
        this.outputBuffer.push(...text.split("\n"));
        // Keep buffer size manageable, e.g., 2x screen height
        const maxBufferSize = this.maxOutputRows * 2;
        if (this.outputBuffer.length > maxBufferSize) {
            this.outputBuffer = this.outputBuffer.slice(this.outputBuffer.length - maxBufferSize);
        }
        this.scrollOffset = Math.max(0, this.outputBuffer.length - this.maxOutputRows);
        this.render();
    }
    
    /**
     * Render the current state of the output buffer to the screen.
     */
    render() {
        if (this.isRendering) return;
        this.isRendering = true;

        const cursorPosition = readline.cursorTo(this.stream, 0, 0); // Save cursor
        
        // Clear working area
        for (let i = 1; i <= this.maxOutputRows; i++) {
            this.moveCursor(1, i);
            readline.clearLine(this.stream, 0);
        }

        // Write buffered content
        const startIndex = this.scrollOffset;
        const endIndex = Math.min(this.outputBuffer.length, startIndex + this.maxOutputRows);

        for (let i = startIndex; i < endIndex; i++) {
            const line = this.outputBuffer[i];
            if (line !== undefined) { // Ensure line is not undefined
                this.moveCursor(1, i - startIndex + 1);
                this.stream.write(line.substring(0, this.columns));
            }
        }
        
        // Restore cursor position for prompt
        this.moveCursor(1, this.promptRow);

        this.isRendering = false;
    }
    
    /**
     * Hide the cursor.
     */
    hideCursor() {
        this.stream.write("\x1b[?25l");
    }

    /**
     * Show the cursor.
     */
    showCursor() {
        this.stream.write("\x1b[?25h");
    }

    /**
     * Scroll the output area up by one line.
     */
    scrollOutputUp() {
        if (this.scrollOffset > 0) {
            this.scrollOffset--;
            this.render();
        }
    }

    /**
     * Scroll the output area down by one line.
     */
    scrollOutputDown() {
        if (this.scrollOffset < this.outputBuffer.length - this.maxOutputRows) {
            this.scrollOffset++;
            this.render();
        }
    }
}