export class WebSocketManager {
    constructor(editor) {
        this.editor = editor;
        this.queueAfterConnect = [];
    }

    ensureConnection(callback) {
        if (this.editor.ws && this.editor.ws.readyState === WebSocket.OPEN) {
            callback();
            return;
        }
        
        this.queueAfterConnect.push(callback);
        
        if (!this.editor.ws || this.editor.ws.readyState === WebSocket.CLOSED || this.editor.ws.readyState === WebSocket.CLOSING) {
            this.connect();
        }
    }

    connect() {
        if (this.editor.ws) {
            this.editor.ws.close();
        }
        
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const wsUrl = isLocal ? `ws://localhost:8787/game?month=${this.editor.month}` : `wss://b.dencat.dev/game?month=${this.editor.month}`;
        
        try {
            this.editor.ws = new WebSocket(wsUrl);
            
            this.editor.ws.addEventListener('open', () => {
            });
            
            this.editor.ws.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'init') {
                        if (data.isNew) {
                            // Room is brand new: check if client has a local drawing
                            const hasLocalDrawing = this.editor.grid.some(val => val !== 0);
                            this.editor.ws.send(JSON.stringify({
                                type: 'palette_init',
                                grid: hasLocalDrawing ? this.editor.grid.join('') : "0".repeat(1024),
                                palette: this.editor.palette
                            }));
                        } else {
                            // Room exists: sync client grid and palette from server
                            this.editor.grid = data.grid.split('').map(Number);
                            this.editor.palette = data.palette;
                            
                            // Save palette locally
                            const paletteKey = `dencat_pixel_palette_month_${this.editor.month}`;
                            localStorage.setItem(paletteKey, this.editor.palette.join(','));
                            // Save grid locally
                            const localKey = `dencat_pixel_grid_month_${this.editor.month}`;
                            localStorage.setItem(localKey, data.grid);
                        }
                        
                        this.editor.renderPaletteUI();
                        this.editor.drawCanvas();
                        this.editor.updateFavicon();

                        // Execute queued actions after successful sync
                        while (this.queueAfterConnect.length > 0) {
                            const cb = this.queueAfterConnect.shift();
                            try { cb(); } catch (err) { console.error("Error in connection queue callback:", err); }
                        }
                    } else if (data.type === 'paint_batch') {
                        const { diffs } = data;
                        if (Array.isArray(diffs)) {
                            for (const diff of diffs) {
                                const idx = diff.y * 32 + diff.x;
                                this.editor.grid[idx] = diff.colorIndex;
                            }
                            this.editor.drawCanvas();
                            this.editor.updateFavicon();
                        }
                    } else if (data.type === 'palette') {
                        this.editor.palette = data.palette;
                        this.editor.renderPaletteUI();
                        this.editor.drawCanvas();
                        this.editor.updateFavicon();
                    }
                } catch (e) {
                    console.error("Malformed websocket message:", e);
                }
            });
        } catch (err) {
            console.warn("WebSocket connection failed. Falling back to local offline mode.");
        }
    }
}
