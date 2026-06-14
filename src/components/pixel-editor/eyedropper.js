export class EyeDropperManager {
    constructor(editor) {
        this.editor = editor;
    }

    pickColor() {
        const bgImgEl = document.getElementById('bgImage');
        if (window.EyeDropper) {
            const eyeDropper = new window.EyeDropper();
            if (bgImgEl) bgImgEl.style.opacity = '1';

            eyeDropper.open().then(result => {
                const color = result.sRGBHex;
                this.editor.updatePaletteColor(this.editor.selectedColorIndex, color);
            }).catch(e => {
                // Ignore cancel/close errors silently to keep console clean
            }).finally(() => {
                if (bgImgEl) bgImgEl.style.opacity = '0.45';
            });
        } else {
            this.startCustomPickMode();
        }
    }

    startCustomPickMode() {
        this.editor.pickingColor = true;
        
        const bgImgEl = document.getElementById('bgImage');
        if (bgImgEl) bgImgEl.style.opacity = '1';

        if (this.editor.container) {
            this.editor.container.style.opacity = '0.05';
            this.editor.container.style.pointerEvents = 'none';
        }
        
        document.body.style.cursor = 'crosshair';
        
        const handlePick = (e) => {
            const clickedInside = this.editor.container && this.editor.container.contains(e.target);
            
            if (!clickedInside) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            document.removeEventListener('click', handlePick, true);
            document.removeEventListener('keydown', handleKey, true);
            document.body.style.cursor = '';
            
            if (this.editor.container) {
                this.editor.container.style.opacity = '';
                this.editor.container.style.pointerEvents = '';
            }
            this.editor.pickingColor = false;
            if (bgImgEl) bgImgEl.style.opacity = '0.45';
            
            if (!clickedInside) {
                this.sampleColorFromScreenCoordinates(e.clientX, e.clientY);
            }
        };

        const handleKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                
                document.removeEventListener('click', handlePick, true);
                document.removeEventListener('keydown', handleKey, true);
                document.body.style.cursor = '';
                
                if (this.editor.container) {
                    this.editor.container.style.opacity = '';
                    this.editor.container.style.pointerEvents = '';
                }
                this.editor.pickingColor = false;
                if (bgImgEl) bgImgEl.style.opacity = '0.45';
            }
        };
        
        document.addEventListener('click', handlePick, true);
        document.addEventListener('keydown', handleKey, true);
    }

    sampleColorFromScreenCoordinates(clientX, clientY) {
        const bgImgEl = document.getElementById('bgImage');
        if (!bgImgEl) return;
        
        const style = window.getComputedStyle(bgImgEl);
        const bgUrlMatch = style.backgroundImage.match(/url\("?([^"]*)"?\)/);
        if (!bgUrlMatch) return;
        
        const imgUrl = bgUrlMatch[1];
        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";
        tempImg.src = imgUrl;
        
        tempImg.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = tempImg.naturalWidth;
            canvas.height = tempImg.naturalHeight;
            ctx.drawImage(tempImg, 0, 0);
            
            const Ws = window.innerWidth;
            const Hs = window.innerHeight;
            const Wi = tempImg.naturalWidth;
            const Hi = tempImg.naturalHeight;
            
            const scale = Math.max(Ws / Wi, Hs / Hi);
            const Wscaled = Wi * scale;
            const Hscaled = Hi * scale;
            
            const Ox = (Ws - Wscaled) / 2;
            const Oy = (Hs - Hscaled) / 2;
            
            const imgX = Math.floor((clientX - Ox) / scale);
            const imgY = Math.floor((clientY - Oy) / scale);
            
            if (imgX >= 0 && imgX < Wi && imgY >= 0 && imgY < Hi) {
                try {
                    const pixel = ctx.getImageData(imgX, imgY, 1, 1).data;
                    const r = pixel[0];
                    const g = pixel[1];
                    const b = pixel[2];
                    const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                    this.editor.updatePaletteColor(this.editor.selectedColorIndex, hex);
                } catch (e) {
                    console.warn("Custom pick failed (canvas access error):", e);
                }
            }
        };
    }
}
