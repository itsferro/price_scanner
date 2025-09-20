/**
 * Shared Navigation and Utilities for Price Scanner System
 */

// ==================== SHARED UTILITIES ====================

class SharedUtils {
    constructor() {
        this.initializeCommonElements();
        this.setupCommonEventListeners();
    }

    initializeCommonElements() {
        // Common notification elements
        this.errorMessage = document.getElementById('error-message');
        this.errorText = document.getElementById('error-text');
        this.successMessage = document.getElementById('success-message');
        this.successText = document.getElementById('success-text');
        this.closeErrorBtn = document.getElementById('close-error');
        this.closeSuccessBtn = document.getElementById('close-success');
    }

    setupCommonEventListeners() {
        this.closeErrorBtn?.addEventListener('click', () => this.hideError());
        this.closeSuccessBtn?.addEventListener('click', () => this.hideSuccess());
    }

    // Notification methods
    showError(message) {
        if (this.errorText && this.errorMessage) {
            this.errorText.textContent = this.escapeHtml(message);
            this.errorMessage.classList.remove('hidden');
            
            setTimeout(() => {
                this.hideError();
            }, 5000);
        }
    }

    hideError() {
        this.errorMessage?.classList.add('hidden');
    }

    showSuccess(message) {
        if (this.successText && this.successMessage) {
            this.successText.textContent = this.escapeHtml(message);
            this.successMessage.classList.remove('hidden');
            
            setTimeout(() => {
                this.hideSuccess();
            }, 3000);
        }
    }

    hideSuccess() {
        this.successMessage?.classList.add('hidden');
    }

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Loading state methods
    showLoading() {
        const loading = document.getElementById('loading-state');
        loading?.classList.remove('hidden');
    }

    hideLoading() {
        const loading = document.getElementById('loading-state');
        loading?.classList.add('hidden');
    }

    // Authentication check
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth-status');
            const data = await response.json();
            return data.authenticated;
        } catch (error) {
            console.error('Auth status check failed:', error);
            return false;
        }
    }

    // API helper with auth handling
    async apiCall(url, options = {}) {
        try {
            const response = await fetch(url, options);
            
            if (response.status === 401) {
                // Redirect to login if unauthorized
                window.location.href = '/login';
                return null;
            }
            
            return response;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }
}

// ==================== BOTTOM NAVIGATION ====================

class BottomNavigation {
    constructor(currentPage) {
        this.currentPage = currentPage;
        this.initializeNavigation();
        this.setupEventListeners();
    }

    initializeNavigation() {
        this.createNavigationHTML();
        this.setActiveTab();
    }

    createNavigationHTML() {
        const navContainer = document.getElementById('bottom-nav');
        if (!navContainer) {
            console.warn('Bottom navigation container not found');
            return;
        }

        navContainer.innerHTML = `
            <nav class="bottom-nav">
                <a href="/scanner" class="nav-item" data-page="scanner">
                    <span class="nav-icon">📱</span>
                    <span class="nav-label">الماسح</span>
                </a>
                <a href="/cart" class="nav-item" data-page="cart">
                    <span class="nav-icon">🛒</span>
                    <span class="nav-label">السلة</span>
                    <span class="cart-badge hidden" id="cart-badge">0</span>
                </a>
                <a href="/info" class="nav-item" data-page="info">
                    <span class="nav-icon">ℹ️</span>
                    <span class="nav-label">المعلومات</span>
                </a>
            </nav>
        `;
    }

    setActiveTab() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const page = item.getAttribute('data-page');
            if (page === this.currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    setupEventListeners() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const page = item.getAttribute('data-page');
                if (page === this.currentPage) {
                    e.preventDefault(); // Don't navigate if already on this page
                }
            });
        });
    }

    updateCartBadge(count) {
        const cartBadge = document.getElementById('cart-badge');
        if (cartBadge) {
            if (count > 0) {
                cartBadge.textContent = count > 99 ? '99+' : count.toString();
                cartBadge.classList.remove('hidden');
            } else {
                cartBadge.classList.add('hidden');
            }
        }
    }
}

// ==================== LOGOUT FUNCTIONALITY ====================

class LogoutHandler {
    constructor() {
        this.setupLogoutHandler();
    }

    setupLogoutHandler() {
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn?.addEventListener('click', () => this.handleLogout());
    }

    async handleLogout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST'
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Clear any local storage
                localStorage.clear();
                sessionStorage.clear();
                
                // Show success message briefly then redirect
                if (window.sharedUtils) {
                    window.sharedUtils.showSuccess(data.message);
                }
                
                setTimeout(() => {
                    window.location.href = data.redirect_url || '/login';
                }, 1000);
            } else {
                throw new Error(data.detail || 'فشل في تسجيل الخروج');
            }

        } catch (error) {
            console.error('Logout error:', error);
            if (window.sharedUtils) {
                window.sharedUtils.showError(error.message || 'خطأ في تسجيل الخروج');
            }
        }
    }
}

// ==================== CART MANAGEMENT ====================

class CartManager {
    constructor() {
        this.cart = this.loadCart();
        this.updateCartDisplay();
    }

    loadCart() {
        try {
            const saved = localStorage.getItem('priceScanner_cart');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading cart:', error);
            return [];
        }
    }

    saveCart() {
        try {
            localStorage.setItem('priceScanner_cart', JSON.stringify(this.cart));
            this.updateCartDisplay();
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    addProduct(product, quantity = 1) {
        const existingIndex = this.cart.findIndex(item => item.barcode === product.barcode);
        
        if (existingIndex >= 0) {
            // Update existing product quantity
            this.cart[existingIndex].quantity += quantity;
        } else {
            // Add new product
            this.cart.push({
                ...product,
                quantity: quantity,
                addedAt: new Date().toISOString()
            });
        }
        
        this.saveCart();
        return true;
    }

    removeProduct(barcode) {
        this.cart = this.cart.filter(item => item.barcode !== barcode);
        this.saveCart();
    }

    updateQuantity(barcode, quantity) {
        const index = this.cart.findIndex(item => item.barcode === barcode);
        if (index >= 0) {
            if (quantity <= 0) {
                this.removeProduct(barcode);
            } else {
                this.cart[index].quantity = quantity;
                this.saveCart();
            }
        }
    }

    clearCart() {
        this.cart = [];
        this.saveCart();
    }

    getCart() {
        return [...this.cart];
    }

    getCartCount() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    updateCartDisplay() {
        const count = this.getCartCount();
        
        // Update navigation badge
        if (window.navigation) {
            window.navigation.updateCartBadge(count);
        }

        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: { count, total: this.getCartTotal(), cart: this.getCart() }
        }));
    }
}

// ==================== INITIALIZATION ====================

// Initialize shared utilities when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing shared utilities...');
    
    // Initialize shared utilities
    window.sharedUtils = new SharedUtils();
    
    // Initialize cart manager
    window.cartManager = new CartManager();
    
    // Initialize logout handler
    window.logoutHandler = new LogoutHandler();
});

// Export for use in other files
window.SharedUtils = SharedUtils;
window.BottomNavigation = BottomNavigation;
window.CartManager = CartManager;