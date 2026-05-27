import { BackgroundComponent } from './components/background.js';
import { SidebarComponent } from './components/sidebar.js';

class App {
    constructor() {
        this.background = new BackgroundComponent();
        this.cursors = null;
        this.sidebar = new SidebarComponent();
    }

    async init() {
        // Initialize layers in order (Background first, then Cursors, then Sidebar overlay)
        this.background.render();

        // Detect if touch/coarse pointer device (mobile/tablet)
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;

        if (isMobile) {
            const { CursorsMobileComponent } = await import('./components/cursors-mobile.js');
            this.cursors = new CursorsMobileComponent();
        } else {
            const { CursorsPcComponent } = await import('./components/cursors-pc.js');
            this.cursors = new CursorsPcComponent();
        }

        this.cursors.render();
        await this.sidebar.render();
    }
}

const app = new App();
app.init();
