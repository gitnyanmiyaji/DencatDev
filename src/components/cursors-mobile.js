export class CursorsMobileComponent {
    constructor() {
        this.ws = null;
        this.otherCursors = new Map(); // id -> { x, y, targetX, targetY, trail: [] }
        this.canvas = null;
        this.ctx = null;
        this.lastSent = 0;
        this.sendInterval = 50; // 50ms interval (20fps) for mobile efficiency
        this.reconnectTimeout = null;
        this.myCursor = { x: 0, y: 0, targetX: 0, targetY: 0, trail: [], color: this.getRandomColor(), opacity: 0.0 };
        this.hasMoved = false;
        this.touchActive = false;
        this.isAnimating = false;
        this.animationFrameId = null;
        this.suspended = false;
    }

    render() {
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'bg-effect'; // CSS layer z-index 15
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '15'; // Below sidebar but above background
        
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.connect();
        this.initTouchListeners();
        this.triggerAnimation(); // Trigger initial loop to clear/setup
    }

    resizeCanvas() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    connect() {
        // Determine ws URL based on current host
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const wsUrl = isLocal ? 'ws://localhost:8787/cursors' : 'wss://b.dencat.dev/cursors';

        console.log(`Connecting to Mobile Cursors WebSocket at: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.id) {
                    if (data.disconnect) {
                        this.otherCursors.delete(data.id);
                    } else if (data.x !== undefined && data.y !== undefined) {
                        const targetX = data.x * this.canvas.width;
                        const targetY = data.y * this.canvas.height;
                        
                        let cursor = this.otherCursors.get(data.id);
                        if (!cursor) {
                            cursor = { 
                                x: targetX, 
                                y: targetY, 
                                targetX, 
                                targetY, 
                                trail: [],
                                color: this.getRandomColor()
                            };
                            this.otherCursors.set(data.id, cursor);
                        } else {
                            cursor.targetX = targetX;
                            cursor.targetY = targetY;
                        }
                        this.triggerAnimation();
                    }
                }
            } catch (err) {
                // Ignore parsing errors
            }
        };

        this.ws.onclose = () => {
            if (this.suspended) return;
            console.log('Mobile Cursors WebSocket disconnected. Reconnecting...');
            this.ws = null;
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
        };

        this.ws.onerror = (err) => {
            console.error('Mobile Cursors WebSocket error:', err);
        };
    }

    triggerAnimation() {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.startDrawLoop();
        }
    }

    getRandomColor() {
        // Vibrant neon colors
        const colors = [
            'rgba(136, 170, 255, ', // Lavender Blue
            'rgba(58, 180, 255, ',  // Ice Blue
            'rgba(248, 113, 113, ', // Soft Red
            'rgba(52, 211, 153, ',  // Emerald Green
            'rgba(251, 191, 36, ',  // Amber Yellow
            'rgba(167, 139, 250, '  // Violet
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    suspend() {
        this.suspended = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.otherCursors.clear();
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
    }

    resume() {
        if (!this.suspended) return;
        this.suspended = false;
        if (this.canvas) {
            this.canvas.style.display = 'block';
        }
        this.connect();
    }

    initTouchListeners() {
        const handleStart = (e) => {
            if (this.suspended) return;
            if (e.touches.length === 0) return;
            this.touchActive = true;
            this.myCursor.opacity = 1.0;
            
            const touch = e.touches[0];
            this.myCursor.targetX = touch.clientX;
            this.myCursor.targetY = touch.clientY;
            
            if (!this.hasMoved) {
                this.myCursor.x = touch.clientX;
                this.myCursor.y = touch.clientY;
                this.hasMoved = true;
            }
            this.triggerAnimation();
        };

        const handleMove = (e) => {
            if (this.suspended) return;
            if (e.touches.length === 0) return;
            this.touchActive = true;
            this.myCursor.opacity = 1.0;

            const touch = e.touches[0];
            this.myCursor.targetX = touch.clientX;
            this.myCursor.targetY = touch.clientY;
            this.triggerAnimation();

            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

            const now = Date.now();
            if (now - this.lastSent > this.sendInterval) {
                const x = touch.clientX / window.innerWidth;
                const y = touch.clientY / window.innerHeight;

                this.ws.send(JSON.stringify({ x, y }));
                this.lastSent = now;
            }
        };

        const handleEnd = () => {
            this.touchActive = false;
        };

        document.addEventListener('touchstart', handleStart, { passive: true });
        document.addEventListener('touchmove', handleMove, { passive: true });
        document.addEventListener('touchend', handleEnd, { passive: true });
        document.addEventListener('touchcancel', handleEnd, { passive: true });
    }

    drawCursor(cursor) {
        const opacity = cursor.opacity !== undefined ? cursor.opacity : 1.0;
        if (opacity <= 0.01) return;

        // Smooth interpolation (lerp) from current pos to target pos
        const dx = cursor.targetX - cursor.x;
        const dy = cursor.targetY - cursor.y;
        if (Math.hypot(dx, dy) < 0.5) {
            cursor.x = cursor.targetX;
            cursor.y = cursor.targetY;
        } else {
            cursor.x += dx * 0.15;
            cursor.y += dy * 0.15;
        }

        // Add to trail (only if touch active or trail isn't fading out completely)
        if (opacity > 0.1) {
            cursor.trail.push({ x: cursor.x, y: cursor.y, age: 0 });
        }

        // Draw trail with dynamic tapering (comet tail)
        if (cursor.trail.length > 1) {
            for (let i = 1; i < cursor.trail.length; i++) {
                const p1 = cursor.trail[i - 1];
                const p2 = cursor.trail[i];

                // Progress goes from 0 (oldest/tail end) to 1 (newest/head end)
                const progress = i / cursor.trail.length;

                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);

                // Width: tapers from 8px (near head) down to 1px (near tail)
                this.ctx.lineWidth = 1 + progress * 7;

                // Alpha: fades out towards the tail (oldest points) * opacity multiplier
                const alpha = progress * 0.5 * opacity;
                this.ctx.strokeStyle = cursor.color + `${alpha})`;

                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.stroke();
            }
        }

        // Draw leading comet head (Coma + Nucleus)
        // 1. Coma (Outer soft glow)
        const comaRadius = 16;
        const grad = this.ctx.createRadialGradient(cursor.x, cursor.y, 1, cursor.x, cursor.y, comaRadius);
        grad.addColorStop(0, cursor.color + `${0.7 * opacity})`);
        grad.addColorStop(0.3, cursor.color + `${0.3 * opacity})`);
        grad.addColorStop(1, cursor.color + '0)');

        this.ctx.beginPath();
        this.ctx.arc(cursor.x, cursor.y, comaRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = grad;
        this.ctx.fill();

        // 2. Nucleus (Bright hot white core)
        this.ctx.beginPath();
        this.ctx.arc(cursor.x, cursor.y, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        this.ctx.shadowColor = cursor.color + `${opacity})`;
        this.ctx.shadowBlur = 10;
        this.ctx.fill();
        this.ctx.shadowBlur = 0; // Reset shadow

        // Age the trail and filter out old points (shorter trail for mobile performance)
        cursor.trail.forEach(pt => pt.age++);
        cursor.trail = cursor.trail.filter(pt => pt.age < 15);
    }

    startDrawLoop() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

        const draw = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            let active = false;

            // Fade local cursor opacity if touch is released
            if (!this.touchActive && this.myCursor.opacity > 0) {
                this.myCursor.opacity = Math.max(0, this.myCursor.opacity - 0.08);
            }

            // Draw local cursor trail if active or fading out
            if (this.hasMoved) {
                if (this.touchActive || this.myCursor.opacity > 0 || this.myCursor.trail.length > 0) {
                    this.drawCursor(this.myCursor);
                    active = true;
                }
            }

            // Draw other players' cursor trails
            this.otherCursors.forEach((cursor) => {
                this.drawCursor(cursor);
                const dist = Math.hypot(cursor.targetX - cursor.x, cursor.targetY - cursor.y);
                if (cursor.trail.length > 0 || dist > 0.5) {
                    active = true;
                }
            });

            if (!active) {
                this.isAnimating = false;
                this.animationFrameId = null;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                return;
            }

            this.animationFrameId = requestAnimationFrame(draw);
        };

        this.animationFrameId = requestAnimationFrame(draw);
    }
}
