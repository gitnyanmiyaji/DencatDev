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
        this.editor.grid = previousState.grid;
        
        // Update UI
        this.editor.drawCanvas();
        this.editor.updateFavicon();
        
        // Save to local storage
        const localKey = `dencat_pixel_grid_month_${this.editor.month}`;
        localStorage.setItem(localKey, this.editor.grid.join(''));
        
        // Broadcast updates if websocket is open
        if (this.editor.ws && this.editor.ws.readyState === WebSocket.OPEN) {
            this.editor.ws.send(JSON.stringify({
                type: 'undo',
                grid: this.editor.grid.join('')
            }));
        }
    }
}
