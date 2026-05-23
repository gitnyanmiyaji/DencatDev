export class BackgroundComponent {
    constructor() {
        this.effectMap = {
            1: 'snow', 2: 'snow', 12: 'snow',
            3: 'petal', 4: 'petal', 5: 'petal',
            6: 'bubble', 7: 'bubble', 8: 'bubble',
            9: 'leaf', 10: 'leaf', 11: 'leaf'
        };
    }

    render() {
        // Create background container elements
        const base = document.createElement('div');
        base.className = 'bg-base';

        const img = document.createElement('div');
        img.className = 'bg-image';
        img.id = 'bgImage';

        const vignette = document.createElement('div');
        vignette.className = 'bg-vignette';

        const effect = document.createElement('div');
        effect.className = 'bg-effect';
        effect.id = 'bgEffect';

        // Append to body
        document.body.appendChild(base);
        document.body.appendChild(img);
        document.body.appendChild(vignette);
        document.body.appendChild(effect);

        this.initSeason(img, effect);
        this.initParallax(img);
    }

    initSeason(imgEl, effectEl) {
        const month = new Date().getMonth() + 1;
        const monthStr = month.toString().padStart(2, '0');
        const effect = this.effectMap[month];
        
        const bgImg = new Image();
        const bgUrl = `./assets/month_${monthStr}.webp`;
        bgImg.src = bgUrl;
        bgImg.onload = () => {
            imgEl.style.backgroundImage = `url('${bgUrl}')`;
            imgEl.style.opacity = '0.45';
        };
        
        const count = effect === 'snow' ? 50 : 30;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = `particle ${effect}`;
            const size = Math.random() * (effect === 'bubble' ? 15 : 5) + 2 + 'px';
            p.style.width = p.style.height = size;
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.animationDuration = Math.random() * 10 + 10 + 's';
            p.style.animationDelay = '-' + Math.random() * 20 + 's';
            effectEl.appendChild(p);
        }
    }

    initParallax(imgEl) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 15;
            const y = (e.clientY / window.innerHeight - 0.5) * 15;
            imgEl.style.transform = `scale(1.05) translate(${x}px, ${y}px)`;
        });
    }
}
