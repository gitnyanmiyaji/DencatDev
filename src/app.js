import { BackgroundComponent } from './components/background.js?v=9';
import { SidebarComponent } from './components/sidebar.js?v=9';
import { PixelEditor } from './components/pixel-editor/index.js?v=9';

class App {
    constructor() {
        this.background = new BackgroundComponent();
        this.cursors = null;
        this.sidebar = new SidebarComponent();
        this.pixelEditor = new PixelEditor(this);
    }

    async init() {
        // Initialize layers in order (Background first, then Cursors, then Sidebar overlay)
        this.background.render();
        this.pixelEditor.render();

        // Detect if touch/coarse pointer device (mobile/tablet)
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;

        if (isMobile) {
            const { CursorsMobileComponent } = await import('./components/cursors-mobile.js?v=9');
            this.cursors = new CursorsMobileComponent();
        } else {
            const { CursorsPcComponent } = await import('./components/cursors-pc.js?v=9');
            this.cursors = new CursorsPcComponent();
        }

        this.cursors.render();
        await this.sidebar.render();
    }
}

const app = new App();
app.init();
