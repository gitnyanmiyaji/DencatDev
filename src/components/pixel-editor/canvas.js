export class CanvasManager {
    constructor(editor) {
        this.editor = editor;
    }

    draw() {
        const canvas = this.editor.container ? this.editor.container.querySelector('#pixel-canvas') : document.getElementById('pixel-canvas');
        if (!canvas) {
            console.warn("⚠️ Canvas element not found!");
            return;
        }
        
        const w = canvas.width / 32;
        const h = canvas.height / 32;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid cells
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
                const colorIdx = this.editor.grid[y * 32 + x];
                const color = this.editor.palette[colorIdx] || '#000000';
                
                ctx.fillStyle = color;
                ctx.fillRect(x * w, y * h, w, h);
            }
        }
        
        // Draw grid lines (distinct grid lines)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 0.5;
        for (let i = 1; i < 32; i++) {
            ctx.beginPath();
            ctx.moveTo(i * w, 0);
            ctx.lineTo(i * w, canvas.height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i * h);
            ctx.lineTo(canvas.width, i * h);
            ctx.stroke();
        }
        
        // Draw cursor frame
        if (this.editor.active) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.editor.cursorX * w, this.editor.cursorY * h, w, h);
            
            // Outer glow
            ctx.strokeStyle = 'var(--accent-color, #88aaff)';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.editor.cursorX * w - 1, this.editor.cursorY * h - 1, w + 2, h + 2);
        }
    }

    updateFavicon() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 32;
        tempCanvas.height = 32;
        const tempCtx = tempCanvas.getContext('2d');
        
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
                const colorIdx = this.editor.grid[y * 32 + x];
                tempCtx.fillStyle = this.editor.palette[colorIdx] || '#000000';
                tempCtx.fillRect(x, y, 1, 1);
            }
        }
        
        const dataUrl = tempCanvas.toDataURL('image/png');
        
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        
        if (!this.editor.originalFavicon) {
            this.editor.originalFavicon = link.href;
        }
        
        link.href = dataUrl;
    }

    restoreFavicon() {
        if (this.editor.originalFavicon) {
            let link = document.querySelector("link[rel~='icon']");
            if (link) {
                link.href = this.editor.originalFavicon;
            }
        }
    }

    exportPng() {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 512;
        exportCanvas.height = 512;
        const exportCtx = exportCanvas.getContext('2d');
        
        exportCtx.imageSmoothingEnabled = false;
        
        const w = 512 / 32;
        const h = 512 / 32;
        
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
                const colorIdx = this.editor.grid[y * 32 + x];
                exportCtx.fillStyle = this.editor.palette[colorIdx] || '#000000';
                exportCtx.fillRect(x * w, y * h, w, h);
            }
        }
        
        const dataUrl = exportCanvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `dencat_pixel_art_month_${this.editor.month}.png`;
        link.href = dataUrl;
        link.click();
    }
}
