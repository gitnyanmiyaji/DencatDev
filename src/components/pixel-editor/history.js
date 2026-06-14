export class HistoryManager {
    constructor(editor) {
        this.editor = editor;
    }

    push() {
        // Limit history size to 50
        this.editor.history.push({
            grid: [...this.editor.grid]
        });
        if (this.editor.history.length > 50) {
            this.editor.history.shift();
        }
    }

    undo() {
        if (this.editor.history.length === 0) return;
        const previousState = this.editor.history.pop();
        
        const diffs = [];
        for (let i = 0; i < 1024; i++) {
            if (this.editor.grid[i] !== previousState.grid[i]) {
                const x = i % 32;
                const y = Math.floor(i / 32);
                diffs.push({
                    x,
                    y,
                    colorIndex: previousState.grid[i]
                });
                this.editor.grid[i] = previousState.grid[i];
            }
        }
        
        // Update UI
        this.editor.drawCanvas();
        this.editor.updateFavicon();
        
        if (diffs.length > 0) {
            this.editor.pendingDiffs.push(...diffs);
            this.editor.queueBatchSend();
        }
    }
}
