export function injectStyles() {
    if (document.getElementById('pixel-editor-styles')) return;
    const style = document.createElement('style');
    style.id = 'pixel-editor-styles';
    style.textContent = `
        .pixel-editor-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 200;
            background: var(--glass-bg, rgba(255, 255, 255, 0.04));
            border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
            backdrop-filter: blur(var(--glass-blur, 24px));
            -webkit-backdrop-filter: blur(var(--glass-blur, 24px));
            color: var(--text-color, #f0f2f5);
            padding: 10px 16px;
            border-radius: 0; /* No rounded corners */
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: inherit;
            font-size: 0.85rem;
            font-weight: 500;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
        }
        .pixel-editor-toggle:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--accent-color, #88aaff);
            transform: translateY(-1px);
        }
        .pixel-editor-toggle.active {
            background: rgba(136, 170, 255, 0.2);
            border-color: var(--accent-color, #88aaff);
            box-shadow: 0 0 15px rgba(136, 170, 255, 0.4);
        }
        .game-icon {
            width: 18px;
            height: 18px;
        }
        
        /* Main Dialog */
        .pixel-editor-dialog {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.95);
            opacity: 0;
            pointer-events: none;
            z-index: 1000;
            background: rgba(10, 15, 25, 0.75);
            backdrop-filter: blur(40px);
            -webkit-backdrop-filter: blur(40px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 0; /* No rounded corners */
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            user-select: none;
        }
        .pixel-editor-dialog.open {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
            pointer-events: auto;
        }
        
        .pixel-editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 12px;
        }
        .pixel-editor-title {
            font-size: 1.1rem;
            font-weight: 600;
            letter-spacing: -0.01em;
            background: linear-gradient(135deg, #fff 0%, #88aaff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .month-select {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: #fff;
            padding: 4px 8px;
            border-radius: 0; /* No rounded corners */
            outline: none;
            font-family: inherit;
            font-size: 0.8rem;
            cursor: pointer;
        }
        .month-select option {
            background: #0a0f19;
            color: #fff;
        }
        
        /* Game Body */
        .pixel-editor-body {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
        }
        .pixel-canvas-wrapper {
            position: relative;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 0; /* No rounded corners */
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .pixel-canvas {
            display: block;
            background: repeating-conic-gradient(rgba(255,255,255,0.02) 0% 25%, transparent 0% 50%) 50% / 16px 16px;
            cursor: crosshair;
        }
        
        /* Colors & Controls */
        .pixel-editor-footer {
            display: flex;
            flex-direction: column;
            gap: 16px;
            width: 100%;
        }
        .palette-container {
            display: flex;
            gap: 8px;
            justify-content: center;
            align-items: center;
        }
        .palette-color {
            width: 32px;
            height: 32px;
            border-radius: 0; /* No rounded corners */
            border: 2px solid transparent;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
        }
        .palette-color.selected {
            border-color: #fff;
            transform: scale(1.1);
            box-shadow: 0 0 10px var(--accent-color, #88aaff);
        }
        .palette-color:hover {
            transform: scale(1.05);
        }
        .palette-num {
            position: absolute;
            bottom: 1px;
            right: 3px;
            font-size: 0.55rem;
            color: rgba(255, 255, 255, 0.6);
            font-family: monospace;
        }
        
        .control-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            gap: 12px;
        }
        
        .btn-action {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: var(--text-color, #f0f2f5);
            padding: 8px 16px;
            border-radius: 0; /* No rounded corners */
            cursor: pointer;
            font-family: inherit;
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .btn-action:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--accent-color, #88aaff);
        }
        
        .color-picker-hint {
            font-size: 0.7rem;
            color: rgba(255, 255, 255, 0.35);
            text-align: center;
        }
        
        /* Overlay is transparent to allow background eyedropper color picking */
        .pixel-editor-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: transparent; /* Transparent background */
            backdrop-filter: none; /* No blur */
            -webkit-backdrop-filter: none;
            opacity: 0;
            pointer-events: none;
            z-index: 999;
            transition: opacity 0.4s ease;
        }
        .pixel-editor-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }
        
        .pixel-btn-close-x {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.4);
            cursor: pointer;
            padding: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            position: absolute;
            top: 6px;
            right: 6px;
        }
        .pixel-btn-close-x:hover {
            color: #fff;
            transform: scale(1.1);
        }
    `;
    document.head.appendChild(style);
}
