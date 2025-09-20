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
        // Use a more robust method to ensure logout buttons are found
        this.retrySetup();
    }

    setupLogoutHandler() {
        this.attachLogoutEvents();
    }

    retrySetup() {
        // Retry finding logout buttons after a short delay
        setTimeout(() => {
            this.attachLogoutEvents();
        }, 500);
        
        // Also retry after DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    this.attachLogoutEvents();
                }, 100);
            });
        }
    }

    attachLogoutEvents() {
        // Find all logout buttons (there might be multiple across different pages)
        const logoutButtons = document.querySelectorAll('#logout-btn, .logout-btn, [data-action="logout"]');
        
        logoutButtons.forEach(button => {
            // Remove existing listeners to avoid duplicates
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add the event listener
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        });
        
        console.log(`Logout handler attached to ${logoutButtons.length} button(s)`);
    }

    async handleLogout() {
        try {
            console.log('Logout initiated...');
            
            // Show loading state
            const logoutBtns = document.querySelectorAll('#logout-btn, .logout-btn, [data-action="logout"]');
            logoutBtns.forEach(btn => {
                btn.disabled = true;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span class="logout-icon">⏳</span>جاري تسجيل الخروج...';
                btn.dataset.originalText = originalText;
            });

            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin' // Ensure cookies are sent
            });

            console.log('Logout response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Logout response:', data);

                if (data.success) {
                    // Clear any local storage
                    try {
                        localStorage.clear();
                        sessionStorage.clear();
                    } catch (e) {
                        console.warn('Could not clear storage:', e);
                    }
                    
                    // Show success message briefly
                    if (window.sharedUtils) {
                        window.sharedUtils.showSuccess(data.message || 'تم تسجيل الخروج بنجاح');
                    }
                    
                    // Redirect after a short delay
                    setTimeout(() => {
                        const redirectUrl = data.redirect_url || '/login';
                        console.log('Redirecting to:', redirectUrl);
                        window.location.href = redirectUrl;
                    }, 1000);
                } else {
                    throw new Error(data.detail || data.message || 'فشل في تسجيل الخروج');
                }
            } else {
                // Even if response is not ok, try to parse it
                let errorMessage = 'فشل في تسجيل الخروج';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch (e) {
                    console.warn('Could not parse error response');
                }
                throw new Error(errorMessage);
            }

        } catch (error) {
            console.error('Logout error:', error);
            
            // Reset buttons
            const logoutBtns = document.querySelectorAll('#logout-btn, .logout-btn, [data-action="logout"]');
            logoutBtns.forEach(btn => {
                btn.disabled = false;
                if (btn.dataset.originalText) {
                    btn.innerHTML = btn.dataset.originalText;
                    delete btn.dataset.originalText;
                }
            });
            
            if (window.sharedUtils) {
                window.sharedUtils.showError(error.message || 'خطأ في تسجيل الخروج');
            }
            
            // If it's an auth error, redirect anyway
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                console.log('Auth error during logout, redirecting anyway...');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
            }
        }
    }

    // Method to manually trigger logout (can be called from other scripts)
    static triggerLogout() {
        if (window.logoutHandler) {
            window.logoutHandler.handleLogout();
        } else {
            console.warn('Logout handler not initialized');
            // Fallback - try direct logout
            fetch('/api/logout', { method: 'POST' })
                .then(() => window.location.href = '/login')
                .catch(() => window.location.href = '/login');
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
    
    // Initialize logout handler with delay to ensure DOM is ready
    setTimeout(() => {
        window.logoutHandler = new LogoutHandler();
    }, 100);
});

// Also initialize logout handler when page is fully loaded
window.addEventListener('load', () => {
    if (!window.logoutHandler) {
        console.log('Initializing logout handler on window load...');
        window.logoutHandler = new LogoutHandler();
    }
});

// Export for use in other files
window.SharedUtils = SharedUtils;
window.BottomNavigation = BottomNavigation;
window.CartManager = CartManager;
window.LogoutHandler = LogoutHandler;