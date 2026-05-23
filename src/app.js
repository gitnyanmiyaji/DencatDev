import { BackgroundComponent } from './components/background.js';
import { SidebarComponent } from './components/sidebar.js';

class App {
    constructor() {
        this.background = new BackgroundComponent();
        this.sidebar = new SidebarComponent();
    }

    async init() {
        // Initialize layers in order (Background first, then Sidebar overlay)
        this.background.render();
        await this.sidebar.render();
    }
}

const app = new App();
app.init();
