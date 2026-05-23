export class SidebarComponent {
    constructor() {
        this.servicesData = [];
    }

    async render() {
        try {
            const res = await fetch('./services.json');
            this.servicesData = await res.json();
        } catch (e) {
            console.error('Failed to load services.json, falling back to empty list', e);
            this.servicesData = [];
        }

        const sidebar = document.createElement('aside');
        sidebar.className = 'sidebar';

        sidebar.innerHTML = `
            <div class="sidebar-handle">
                <span class="handle-text">dencat.dev portal</span>
            </div>
            <div class="sidebar-content">
                <header class="sidebar-header">
                    <h1 class="logo">dencat.dev</h1>
                    <p class="tagline">The Digital Garden</p>
                </header>
                <div id="public-links">
                    <div class="section-label">Public Services</div>
                    <nav class="explorer-list" id="public-list"></nav>
                </div>
                <div class="private-section" id="private-links">
                    <div class="section-label">Modeling Community</div>
                    <nav class="explorer-list" id="private-list"></nav>
                </div>
                <footer class="sidebar-footer">
                    <p>&copy; 2026 dencat.dev</p>
                    <p class="yuki-quote">"Always by your side." — Yuki</p>
                </footer>
            </div>
        `;

        document.body.appendChild(sidebar);
        this.renderServices(sidebar);
    }

    renderServices(sidebarEl) {
        const publicList = sidebarEl.querySelector('#public-list');
        const privateList = sidebarEl.querySelector('#private-list');

        this.servicesData.forEach(service => {
            const item = document.createElement('a');
            item.href = service.url;
            item.className = 'explorer-item';
            
            const isPrivate = service.category === 'private';
            const icon = isPrivate 
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

            item.innerHTML = `
                <div class="item-icon">${icon}</div>
                <div class="item-info">
                    <span class="item-name">${service.name}</span>
                    <span class="item-path">${service.path}</span>
                </div>
            `;
            
            if (isPrivate) {
                privateList.appendChild(item);
            } else {
                publicList.appendChild(item);
            }
        });
    }
}
