import { injectStyles } from './styles.js?v=9';
import { HistoryManager } from './history.js?v=9';
import { EyeDropperManager } from './eyedropper.js?v=9';
import { WebSocketManager } from './websocket.js?v=9';
import { CanvasManager } from './canvas.js?v=9';

export class PixelEditorComponent {
    constructor(appInstance = null) {
        this.app = appInstance;
        this.active = false;
        
        // Game states
        this.month = new Date().getMonth() + 1;
        this.grid = Array(32 * 32).fill(0); // 1024 cells storing palette indexes (0-7)
        this.palette = [
            '#0f172a', '#1e293b', '#334155', '#475569', 
            '#64748b', '#94a3b8', '#cbd5e1', '#f8fafc'
        ]; // Default fallback slate palette
        this.selectedColorIndex = 0;
        this.cursorX = 16;
        this.cursorY = 16;
        this.history = []; // History stack for Ctrl+Z undo
        this.version = '0.1';
        this.paletteHistory = []; // Separate stack for palette undos
        this.pendingDiffs = [];
        this.batchTimeout = null;
        
        // Sub-managers
        this.historyManager = new HistoryManager(this);
        this.eyeDropper = new EyeDropperManager(this);
        this.webSocket = new WebSocketManager(this);
        this.canvasManager = new CanvasManager(this);
        
        // DOM Elements
        this.container = null;
        this.ws = null;
        this.saveTimeout = null;
        this.originalFavicon = null;
        
        // Binding handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleCanvasInteraction = this.handleCanvasInteraction.bind(this);
    }

    render() {
        // Create Toggle Button in Top-Right
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'pixel-editor-toggle';
        toggleBtn.className = 'pixel-editor-toggle';
        toggleBtn.innerHTML = `
            <svg class="game-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M9 3v18M15 3v18M3 9h18M3 15h18"></path>
            </svg>
            <span>PixelEditor</span>
        `;
        
        injectStyles();
        
        document.body.appendChild(toggleBtn);
        toggleBtn.addEventListener('click', () => this.toggle());
    }

    async toggle() {
        this.active = !this.active;
        const toggleBtn = document.getElementById('pixel-editor-toggle');
        const vignette = document.querySelector('.bg-vignette');
        
        if (this.active) {
            toggleBtn.classList.add('active');
            
            // Suspend standard cursor synchronization
            if (this.app?.cursors && typeof this.app.cursors.suspend === 'function') {
                this.app.cursors.suspend();
            }
            
            // Hide vignette for color picking
            if (vignette) {
                vignette.style.opacity = '0';
            }
            
            // Sync background to current selected month
            if (this.app?.background && typeof this.app.background.setMonth === 'function') {
                this.app.background.setMonth(this.month);
            }
            
            // Build the Modal Dialog if not present
            this.buildDialog();
            this.openDialog();
            
            // Load Palette from current background and game data
            await this.loadData();
            
            // Bind keyboard listeners
            window.addEventListener('keydown', this.handleKeyDown);
        } else {
            toggleBtn.classList.remove('active');
            this.closeDialog();
            
            // Restore vignette
            if (vignette) {
                vignette.style.opacity = '1';
            }
            
            // Restore current month background
            const currentRealMonth = new Date().getMonth() + 1;
            if (this.app?.background && typeof this.app.background.setMonth === 'function') {
                this.app.background.setMonth(currentRealMonth);
            }
            
            // Resume standard cursor synchronization
            if (this.app?.cursors && typeof this.app.cursors.resume === 'function') {
                this.app.cursors.resume();
            }
            
            // Unbind keyboard listeners
            window.removeEventListener('keydown', this.handleKeyDown);
            
            // Restore Original Favicon if any
            this.restoreFavicon();
            
            // Close WebSocket
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
        }
    }

    buildDialog() {
        if (this.container) return;

        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'pixel-editor-overlay';
        overlay.id = 'pixel-editor-overlay';
        document.body.appendChild(overlay);

        // Dialog Container
        const dialog = document.createElement('div');
        dialog.className = 'pixel-editor-dialog';
        dialog.id = 'pixel-editor-dialog';
        
        dialog.innerHTML = `
            <button class="pixel-btn-close-x" id="pixel-btn-close" title="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div class="pixel-editor-header" style="padding-right: 12px;">
                <div class="pixel-editor-title">PixelEditor <span style="font-size: 0.75rem; font-weight: normal; color: #fff; opacity: 0.5; margin-left: 6px; -webkit-text-fill-color: #fff; background: none;">v${this.version}</span></div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="btn-action" id="pixel-btn-export" style="padding: 4px 10px; font-size: 0.75rem;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
                        </svg>
                        Export PNG
                    </button>
                    <select class="month-select" id="pixel-month-select">
                        ${Array.from({length: 12}, (_, i) => `
                            <option value="${i+1}" ${this.month === i+1 ? 'selected' : ''}>${i+1}月 (Slot ${i+1})</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            <div class="pixel-editor-body">
                <div class="pixel-canvas-wrapper">
                    <canvas class="pixel-canvas" id="pixel-canvas" width="384" height="384"></canvas>
                </div>
            </div>
            <div class="pixel-editor-footer">
                <div class="palette-container" id="pixel-palette">
                    <!-- Dynamic colors inserted here -->
                </div>
                <div class="color-picker-hint">💡 スポイトボタンを押すと、背景画像から色を抽出してパレットに適用できます</div>
                <div style="display: flex; width: 100%; gap: 12px;">
                    <button class="btn-action" id="pixel-btn-spoit-undo" disabled style="flex: 1; justify-content: center; opacity: 0.3; cursor: not-allowed;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                        スポイト戻る
                    </button>
                    <button class="btn-action" id="pixel-btn-spoit" style="flex: 1; justify-content: center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-dasharray="none" stroke-width="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        スポイト
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        this.container = dialog;
        
        // Canvas initialization
        const canvas = document.getElementById('pixel-canvas');
        
        // Listeners for canvas mouse interaction
        canvas.addEventListener('mousedown', (e) => this.handleCanvasInteraction(e, true));
        canvas.addEventListener('mousemove', (e) => this.handleCanvasInteraction(e, false));
        
        // Actions
        document.getElementById('pixel-month-select').addEventListener('change', (e) => {
            this.month = parseInt(e.target.value, 10);
            if (this.app?.background && typeof this.app.background.setMonth === 'function') {
                this.app.background.setMonth(this.month);
            }
            this.loadData();
        });
        
        document.getElementById('pixel-btn-spoit-undo').addEventListener('click', () => this.undoPalette());
        document.getElementById('pixel-btn-spoit').addEventListener('click', () => this.eyeDropper.pickColor());
        document.getElementById('pixel-btn-export').addEventListener('click', () => this.canvasManager.exportPng());
        document.getElementById('pixel-btn-close').addEventListener('click', () => this.toggle());
    }

    openDialog() {
        document.getElementById('pixel-editor-overlay').classList.add('active');
        this.container.classList.add('open');
    }

    closeDialog() {
        if (this.container) {
            document.getElementById('pixel-editor-overlay').classList.remove('active');
            this.container.classList.remove('open');
        }
    }

    async loadData() {
        // Clear history stack on month change
        this.history = [];
        this.paletteHistory = [];
        this.updatePaletteUndoButtonState();
        
        // Load palette from localStorage (or defaults if missing)
        const paletteKey = `dencat_pixel_palette_month_${this.month}`;
        const savedPalette = localStorage.getItem(paletteKey);
        
        if (savedPalette) {
            this.palette = savedPalette.split(',');
            this.renderPaletteUI();
        } else {
            this.samplePaletteFromBackground();
        }
        
        // Load initial grid from localStorage or API
        const localKey = `dencat_pixel_grid_month_${this.month}`;
        const savedGrid = localStorage.getItem(localKey);
        if (savedGrid && savedGrid.length === 1024) {
            this.grid = savedGrid.split('').map(Number);
        } else {
            this.grid = Array(32 * 32).fill(0);
        }
        
        // Render initial Canvas state
        this.drawCanvas();
        this.updateFavicon();
        
        // Connect to WebSocket Room
        this.webSocket.connect();
    }

    samplePaletteFromBackground() {
        const monthStr = this.month.toString().padStart(2, '0');
        const imgUrl = `./assets/month_${monthStr}.webp`;
        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";
        tempImg.src = imgUrl;
        
        tempImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 8;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(tempImg, 0, 0, 8, 1);
            
            try {
                const imgData = ctx.getImageData(0, 0, 8, 1).data;
                const colors = [];
                for (let i = 0; i < 8; i++) {
                    const r = imgData[i * 4];
                    const g = imgData[i * 4 + 1];
                    const b = imgData[i * 4 + 2];
                    const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                    colors.push(hex);
                }
                this.palette = colors;
                
                const paletteKey = `dencat_pixel_palette_month_${this.month}`;
                localStorage.setItem(paletteKey, this.palette.join(','));
                
                this.renderPaletteUI();
                this.drawCanvas();
                this.updateFavicon();
            } catch (e) {
                console.warn("Could not sample colors from background image. Using defaults.");
            }
        };
    }

    renderPaletteUI() {
        const paletteContainer = document.getElementById('pixel-palette');
        if (!paletteContainer) return;
        
        paletteContainer.innerHTML = this.palette.map((color, idx) => `
            <div class="palette-color ${this.selectedColorIndex === idx ? 'selected' : ''}" 
                 style="background-color: ${color};" 
                 data-idx="${idx}">
                 <div class="palette-num">${idx + 1}</div>
            </div>
        `).join('');
        
        paletteContainer.querySelectorAll('.palette-color').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.getAttribute('data-idx'), 10);
                this.selectedColorIndex = idx;
                
                paletteContainer.querySelectorAll('.palette-color').forEach(p => p.classList.remove('selected'));
                el.classList.add('selected');
            });
        });
    }

    updatePaletteColor(idx, color) {
        if (this.palette[idx] === color) return;
        
        // Save current palette state to paletteHistory before changing
        this.paletteHistory.push([...this.palette]);
        if (this.paletteHistory.length > 50) {
            this.paletteHistory.shift();
        }
        this.updatePaletteUndoButtonState();

        this.palette[idx] = color;
        
        const paletteKey = `dencat_pixel_palette_month_${this.month}`;
        localStorage.setItem(paletteKey, this.palette.join(','));
        
        this.renderPaletteUI();
        this.drawCanvas();
        this.updateFavicon();
        
        this.webSocket.ensureConnection(() => {
            this.ws.send(JSON.stringify({
                type: 'palette',
                palette: this.palette
            }));
        });
        this.triggerSave();
    }

    undoPalette() {
        if (this.paletteHistory.length === 0) return;
        
        const previousPalette = this.paletteHistory.pop();
        this.palette = previousPalette;
        
        this.renderPaletteUI();
        this.drawCanvas();
        this.updateFavicon();
        this.updatePaletteUndoButtonState();
        
        const paletteKey = `dencat_pixel_palette_month_${this.month}`;
        localStorage.setItem(paletteKey, this.palette.join(','));
        
        this.webSocket.ensureConnection(() => {
            this.ws.send(JSON.stringify({
                type: 'palette',
                palette: this.palette
            }));
        });
        this.triggerSave();
    }

    updatePaletteUndoButtonState() {
        const btn = document.getElementById('pixel-btn-spoit-undo');
        if (btn) {
            const hasHistory = this.paletteHistory.length > 0;
            btn.disabled = !hasHistory;
            btn.style.opacity = hasHistory ? '1' : '0.3';
            btn.style.cursor = hasHistory ? 'pointer' : 'not-allowed';
        }
    }

    handleCanvasInteraction(e, isMouseDown) {
        if (!isMouseDown && e.buttons !== 1) return;
        
        const canvas = document.getElementById('pixel-canvas');
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        
        const x = Math.floor((clientX / rect.width) * 32);
        const y = Math.floor((clientY / rect.height) * 32);
        
        if (x >= 0 && x < 32 && y >= 0 && y < 32) {
            const idx = y * 32 + x;
            if (this.grid[idx] !== this.selectedColorIndex) {
                if (isMouseDown) {
                    this.pushHistory();
                }
                this.paintPixel(x, y);
            }
            this.cursorX = x;
            this.cursorY = y;
        }
    }

    paintPixel(x, y) {
        const idx = y * 32 + x;
        if (this.grid[idx] === this.selectedColorIndex) return;
        
        this.grid[idx] = this.selectedColorIndex;
        this.drawCanvas();
        this.updateFavicon();
        
        this.pendingDiffs.push({ x, y, colorIndex: this.selectedColorIndex });
        this.queueBatchSend();
    }

    queueBatchSend() {
        if (this.batchTimeout === null) {
            this.batchTimeout = setTimeout(() => {
                this.sendPendingDiffs();
            }, 500);
        }
    }

    sendPendingDiffs() {
        this.batchTimeout = null;
        if (this.pendingDiffs.length === 0) return;

        const diffsToSend = [...this.pendingDiffs];
        this.pendingDiffs = [];
        this.triggerSave();

        this.webSocket.ensureConnection(() => {
            this.ws.send(JSON.stringify({
                type: 'paint_batch',
                diffs: diffsToSend
            }));
        });
    }

    triggerSave() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            const localKey = `dencat_pixel_grid_month_${this.month}`;
            localStorage.setItem(localKey, this.grid.join(''));
        }, 1000);
    }

    handleKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            this.undo();
            e.preventDefault();
            return;
        }

        let moved = false;
        
        if (e.key === 'ArrowUp') {
            this.cursorY = Math.max(0, this.cursorY - 1);
            moved = true;
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            this.cursorY = Math.min(31, this.cursorY + 1);
            moved = true;
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            this.cursorX = Math.max(0, this.cursorX - 1);
            moved = true;
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            this.cursorX = Math.min(31, this.cursorX + 1);
            moved = true;
            e.preventDefault();
        } else if (e.key === ' ' || e.key === 'Enter') {
            const idx = this.cursorY * 32 + this.cursorX;
            if (this.grid[idx] !== this.selectedColorIndex && !e.repeat) {
                this.pushHistory();
            }
            this.paintPixel(this.cursorX, this.cursorY);
            e.preventDefault();
        } else if (e.key >= '1' && e.key <= '8') {
            const idx = parseInt(e.key, 10) - 1;
            this.selectedColorIndex = idx;
            this.renderPaletteUI();
            e.preventDefault();
        }
        
        if (moved) {
            this.drawCanvas();
        }
    }

    // Delegation helpers to sub-managers
    pushHistory() { this.historyManager.push(); }
    undo() { this.historyManager.undo(); }
    drawCanvas() { this.canvasManager.draw(); }
    updateFavicon() { this.canvasManager.updateFavicon(); }
    restoreFavicon() { this.canvasManager.restoreFavicon(); }
}

// Alias to allow simple import of PixelEditor
export { PixelEditorComponent as PixelEditor };
