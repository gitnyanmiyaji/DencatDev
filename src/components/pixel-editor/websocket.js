export class WebSocketManager {
    constructor(editor) {
        this.editor = editor;
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
                        this.editor.grid = data.grid.split('').map(Number);
                        
                        if (data.isNew) {
                            // Room is brand new: send current local palette (sampled or saved) to server
                            this.editor.ws.send(JSON.stringify({
                                type: 'palette',
                                palette: this.editor.palette
                            }));
                        } else {
                            // Room exists: sync local palette to server palette
                            this.editor.palette = data.palette;
                            const paletteKey = `dencat_pixel_palette_month_${this.editor.month}`;
                            localStorage.setItem(paletteKey, this.editor.palette.join(','));
                        }
                        
                        this.editor.renderPaletteUI();
                        this.editor.drawCanvas();
                        this.editor.updateFavicon();
                    } else if (data.type === 'paint') {
                        const idx = data.y * 32 + data.x;
                        this.editor.grid[idx] = data.colorIndex;
                        this.editor.drawCanvas();
                        this.editor.updateFavicon();
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
