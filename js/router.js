// ============================================================
// GenApp — Client-side Router
// ============================================================

export class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.container = null;
    this.onNavigate = null;
    
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    window.location.hash = `#/${path}`;
  }

  handleRoute() {
    const hash = window.location.hash.slice(2) || 'dashboard';
    
    if (this.currentRoute === hash) return;
    
    const handler = this.routes[hash];
    if (!handler) {
      this.navigate('dashboard');
      return;
    }

    // Page transition
    if (this.container) {
      this.container.classList.remove('page-enter');
      void this.container.offsetWidth; // force reflow
      this.container.classList.add('page-enter');
    }

    this.currentRoute = hash;
    
    // Update sidebar nav active states
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === hash);
    });

    // Update bottom nav active states
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === hash);
    });

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');

    // Render page
    if (this.container) {
      handler(this.container);
    }

    if (this.onNavigate) {
      this.onNavigate(hash);
    }
  }

  getCurrentRoute() {
    return this.currentRoute;
  }
}

export const router = new Router();
