import { BackgroundComponent } from './components/background.js';
import { SidebarComponent } from './components/sidebar.js';
import { CursorsComponent } from './components/cursors.js';

class App {
    constructor() {
        this.background = new BackgroundComponent();
        this.cursors = new CursorsComponent();
        this.sidebar = new SidebarComponent();
    }

    async init() {
        // Initialize layers in order (Background first, then Cursors, then Sidebar overlay)
        this.background.render();
        this.cursors.render();
        await this.sidebar.render();
    }
}

const app = new App();
app.init();
