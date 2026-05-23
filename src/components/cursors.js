export class CursorsComponent {
    constructor() {
        this.ws = null;
        this.otherCursors = new Map(); // id -> { x, y, targetX, targetY, trail: [] }
        this.canvas = null;
        this.ctx = null;
        this.lastSent = 0;
        this.sendInterval = 40; // 40ms interval (25fps)
        this.reconnectTimeout = null;
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
        this.initMouseListener();
        this.startDrawLoop();
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

        console.log(`Connecting to Cursors WebSocket at: ${wsUrl}`);
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
                    }
                }
            } catch (err) {
                // Ignore parsing errors
            }
        };

        this.ws.onclose = () => {
            console.log('Cursors WebSocket disconnected. Reconnecting...');
            this.ws = null;
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
        };

        this.ws.onerror = (err) => {
            console.error('Cursors WebSocket error:', err);
        };
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

    initMouseListener() {
        document.addEventListener('mousemove', (e) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

            const now = Date.now();
            if (now - this.lastSent > this.sendInterval) {
                const x = e.clientX / window.innerWidth;
                const y = e.clientY / window.innerHeight;
                
                this.ws.send(JSON.stringify({ x, y }));
                this.lastSent = now;
            }
        });
    }

    startDrawLoop() {
        const draw = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.otherCursors.forEach((cursor, id) => {
                // Smooth interpolation (lerp) from current pos to target pos
                cursor.x += (cursor.targetX - cursor.x) * 0.15;
                cursor.y += (cursor.targetY - cursor.y) * 0.15;

                // Add to trail
                cursor.trail.push({ x: cursor.x, y: cursor.y, age: 0 });

                // Draw trail with neon fading
                if (cursor.trail.length > 1) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(cursor.trail[0].x, cursor.trail[0].y);
                    
                    for (let i = 1; i < cursor.trail.length; i++) {
                        const pt = cursor.trail[i];
                        this.ctx.lineTo(pt.x, pt.y);
                    }
                    
                    // Style line
                    this.ctx.strokeStyle = cursor.color + '0.4)';
                    this.ctx.lineWidth = 3;
                    this.ctx.lineCap = 'round';
                    this.ctx.lineJoin = 'round';
                    this.ctx.stroke();
                }

                // Draw leading cursor dot
                this.ctx.beginPath();
                this.ctx.arc(cursor.x, cursor.y, 4, 0, Math.PI * 2);
                this.ctx.fillStyle = cursor.color + '0.9)';
                this.ctx.shadowColor = cursor.color + '1)';
                this.ctx.shadowBlur = 8;
                this.ctx.fill();
                this.ctx.shadowBlur = 0; // Reset shadow

                // Age the trail and filter out old points
                cursor.trail.forEach(pt => pt.age++);
                cursor.trail = cursor.trail.filter(pt => pt.age < 15); // keep last 15 frames
            });

            requestAnimationFrame(draw);
        };

        requestAnimationFrame(draw);
    }
}
