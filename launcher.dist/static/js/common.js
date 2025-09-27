/**
 * COMMON.JS - Shared JavaScript Utilities
 * Modular, focused shared functionality for all pages
 */

// ==================== SHARED UTILITIES CLASS ====================

class SharedUtils {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        // Common notification elements
        this.errorMessage = document.getElementById('error-message');
        this.errorText = document.getElementById('error-text');
        this.successMessage = document.getElementById('success-message');
        this.successText = document.getElementById('success-text');
        this.closeErrorBtn = document.getElementById('close-error');
        this.closeSuccessBtn = document.getElementById('close-success');
        this.loadingState = document.getElementById('loading-state');
    }

    setupEventListeners() {
        this.closeErrorBtn?.addEventListener('click', () => this.hideError());
        this.closeSuccessBtn?.addEventListener('click', () => this.hideSuccess());
    }

    // Notification methods
    showError(message) {
        if (this.errorText && this.errorMessage) {
            this.errorText.textContent = this.escapeHtml(message);
            this.errorMessage.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => this.hideError(), 5000);
        } else {
            // Fallback to alert if UI elements not available
            console.error('Error:', message);
            alert('خطأ: ' + message);
        }
    }

    hideError() {
        this.errorMessage?.classList.add('hidden');
    }

    showSuccess(message) {
        if (this.successText && this.successMessage) {
            this.successText.textContent = this.escapeHtml(message);
            this.successMessage.classList.remove('hidden');
            
            // Auto-hide after 3 seconds
            setTimeout(() => this.hideSuccess(), 3000);
        } else {
            // Fallback to console if UI elements not available
            console.log('Success:', message);
        }
    }

    hideSuccess() {
        this.successMessage?.classList.add('hidden');
    }

    // Loading state methods
    showLoading() {
        this.loadingState?.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingState?.classList.add('hidden');
    }

    // Utility methods
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // API helper with auth handling
    async apiCall(url, options = {}) {
        try {
            const response = await fetch(url, options);
            
            // Handle authentication errors
            if (response.status === 401) {
                console.log('Authentication required, redirecting to login...');
                window.location.href = '/login';
                return null;
            }
            
            return response;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
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
}

// ==================== CART MANAGER CLASS ====================

class CartManager {
    constructor() {
        this.storageKey = 'priceScanner_cart';
        this.cart = this.loadCart();
        this.setupStorageListener();
        console.log('CartManager initialized with', this.cart.length, 'items');
    }

    loadCart() {
        try {
            if (typeof(Storage) === "undefined") {
                console.warn('localStorage not supported, using memory storage');
                return [];
            }

            const saved = localStorage.getItem(this.storageKey);
            const cart = saved ? JSON.parse(saved) : [];
            console.log('Loaded cart from storage:', cart.length, 'items');
            return cart;
        } catch (error) {
            console.error('Error loading cart:', error);
            return [];
        }
    }

    saveCart() {
        try {
            if (typeof(Storage) !== "undefined") {
                localStorage.setItem(this.storageKey, JSON.stringify(this.cart));
            }
            
            // Trigger cart update event
            this.dispatchCartUpdate();
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    setupStorageListener() {
        if (typeof(Storage) !== "undefined") {
            window.addEventListener('storage', (e) => {
                if (e.key === this.storageKey) {
                    this.cart = e.newValue ? JSON.parse(e.newValue) : [];
                    this.dispatchCartUpdate();
                    console.log('Cart updated from storage event');
                }
            });
        }
    }

    addProduct(product, quantity = 1) {
        try {
            if (!product || !product.barcode) {
                console.error('Invalid product data:', product);
                return false;
            }

            if (!quantity || quantity < 1) {
                console.error('Invalid quantity:', quantity);
                return false;
            }

            // Check if product already exists in cart
            const existingIndex = this.cart.findIndex(item => item.barcode === product.barcode);
            
            if (existingIndex >= 0) {
                this.cart[existingIndex].quantity += quantity;
                console.log(`Updated existing product ${product.barcode}, new quantity:`, this.cart[existingIndex].quantity);
            } else {
                const cartItem = {
                    barcode: product.barcode,
                    product_name: product.product_name || 'Unknown Product',
                    price: product.price || 0,
                    stock_qty: product.stock_qty || 0,
                    currency: product.currency || 'USD',
                    quantity: quantity,
                    addedAt: new Date().toISOString()
                };
                this.cart.push(cartItem);
                console.log('Added new product to cart:', cartItem.product_name);
            }
            
            this.saveCart();
            return true;
        } catch (error) {
            console.error('Error adding product to cart:', error);
            return false;
        }
    }

    removeProduct(barcode) {
        try {
            const initialLength = this.cart.length;
            this.cart = this.cart.filter(item => item.barcode !== barcode);
            
            if (this.cart.length < initialLength) {
                console.log(`Removed product ${barcode} from cart`);
                this.saveCart();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error removing product from cart:', error);
            return false;
        }
    }

    updateQuantity(barcode, quantity) {
        try {
            const index = this.cart.findIndex(item => item.barcode === barcode);
            if (index >= 0) {
                if (quantity <= 0) {
                    return this.removeProduct(barcode);
                } else {
                    this.cart[index].quantity = quantity;
                    console.log(`Updated quantity for ${barcode} to ${quantity}`);
                    this.saveCart();
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error updating quantity:', error);
            return false;
        }
    }

    clearCart() {
        try {
            this.cart = [];
            this.saveCart();
            console.log('Cart cleared');
            return true;
        } catch (error) {
            console.error('Error clearing cart:', error);
            return false;
        }
    }

    getCart() {
        return [...this.cart];
    }

    getCartCount() {
        try {
            return this.cart.reduce((total, item) => total + (item.quantity || 0), 0);
        } catch (error) {
            console.error('Error calculating cart count:', error);
            return 0;
        }
    }

    getCartTotal() {
        try {
            return this.cart.reduce((total, item) => {
                const price = parseFloat(item.price) || 0;
                const quantity = parseInt(item.quantity) || 0;
                return total + (price * quantity);
            }, 0);
        } catch (error) {
            console.error('Error calculating cart total:', error);
            return 0;
        }
    }

    dispatchCartUpdate() {
        try {
            const count = this.getCartCount();
            const total = this.getCartTotal();

            // Update navigation badge if it exists
            if (window.navigation) {
                window.navigation.updateCartBadge(count);
            }

            // Dispatch custom event for other components
            const event = new CustomEvent('cartUpdated', {
                detail: { count, total, cart: this.getCart() }
            });
            document.dispatchEvent(event);

            console.log(`Cart updated - Count: ${count}, Total: ${total.toFixed(2)}`);
        } catch (error) {
            console.error('Error dispatching cart update:', error);
        }
    }
}

// ==================== BOTTOM NAVIGATION CLASS ====================

class BottomNavigation {
    constructor(currentPage) {
        this.currentPage = currentPage;
        this.initializeNavigation();
        console.log('BottomNavigation initialized for page:', currentPage);
    }

    initializeNavigation() {
        this.createNavigationHTML();
        this.setActiveTab();
        this.setupEventListeners();
        this.updateCartBadge();
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
                    <span class="nav-icon"><i class="fas fa-mobile-alt"></i></span>
                    <span class="nav-label">الماسح</span>
                </a>
                <a href="/cart" class="nav-item" data-page="cart">
                    <span class="nav-icon"><i class="fas fa-shopping-cart"></i></span>
                    <span class="nav-label">السلة</span>
                    <span class="cart-badge" id="cart-badge">0</span>
                </a>
                <a href="/info" class="nav-item" data-page="info">
                    <span class="nav-icon"><i class="fas fa-info-circle"></i></span>
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

    updateCartBadge(count = null) {
        if (count === null && window.cartManager) {
            count = window.cartManager.getCartCount();
        } else if (count === null) {
            count = 0;
        }

        const cartBadge = document.getElementById('cart-badge');
        if (cartBadge) {
            cartBadge.textContent = count > 99 ? '99+' : count.toString();
            
            // Update visual styling
            cartBadge.classList.remove('cart-empty', 'cart-has-items');
            if (count === 0) {
                cartBadge.classList.add('cart-empty');
            } else {
                cartBadge.classList.add('cart-has-items');
            }
            
            console.log(`Cart badge updated to: ${count}`);
        }
    }
}

// ==================== LOGOUT HANDLER CLASS ====================

class LogoutHandler {
    constructor() {
        this.setupLogoutHandler();
    }

    setupLogoutHandler() {
        // Use event delegation to handle logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('#logout-btn, .logout-btn, [data-action="logout"]')) {
                e.preventDefault();
                this.handleLogout();
            }
        });
        
        console.log('LogoutHandler initialized');
    }

    async handleLogout() {
        try {
            console.log('Logout initiated...');
            
            // Show loading state on logout buttons
            const logoutBtns = document.querySelectorAll('#logout-btn, .logout-btn, [data-action="logout"]');
            logoutBtns.forEach(btn => {
                btn.disabled = true;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span class="logout-icon"><i class="fas fa-spinner fa-spin"></i></span>جاري تسجيل الخروج...';
                btn.dataset.originalText = originalText;
            });

            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin'
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Clear local storage
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                } catch (e) {
                    console.warn('Could not clear storage:', e);
                }
                
                // Show success message
                if (window.sharedUtils) {
                    window.sharedUtils.showSuccess(data.message || 'تم تسجيل الخروج بنجاح');
                }
                
                // Redirect after brief delay
                setTimeout(() => {
                    window.location.href = data.redirect_url || '/login';
                }, 1000);
            } else {
                throw new Error(data.detail || data.message || 'فشل في تسجيل الخروج');
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
            
            // If auth error, redirect anyway
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                setTimeout(() => window.location.href = '/login', 1500);
            }
        }
    }
}

// ==================== INITIALIZATION ====================

// Global initialization flag
window.commonUtilsReady = false;

// Initialize shared utilities when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing common utilities...');
    
    try {
        // Initialize core utilities
        window.sharedUtils = new SharedUtils();
        window.cartManager = new CartManager();
        window.logoutHandler = new LogoutHandler();
        
        // Set ready flag
        window.commonUtilsReady = true;
        
        // Dispatch ready event for page-specific scripts
        document.dispatchEvent(new CustomEvent('commonUtilsReady'));
        
        console.log('Common utilities initialized successfully');
        
    } catch (error) {
        console.error('Error initializing common utilities:', error);
        
        // Show error to user
        alert('خطأ في تحميل التطبيق: ' + error.message);
    }
});

// Utility function to wait for common utilities
window.waitForCommonUtils = function() {
    return new Promise((resolve) => {
        if (window.commonUtilsReady && window.cartManager && window.sharedUtils) {
            resolve();
        } else {
            document.addEventListener('commonUtilsReady', () => resolve(), { once: true });
        }
    });
};

// Global debug functions for development
if (typeof window !== 'undefined') {
    window.debugCart = function() {
        if (window.cartManager) {
            console.log('=== CART DEBUG ===');
            console.log('Cart items:', window.cartManager.getCart());
            console.log('Cart count:', window.cartManager.getCartCount());
            console.log('Cart total:', window.cartManager.getCartTotal());
        } else {
            console.error('Cart manager not available');
        }
    };
    
    window.clearDebugCart = function() {
        if (window.cartManager) {
            window.cartManager.clearCart();
            console.log('Debug: Cart cleared');
        }
    };
}

// Export classes for use in page-specific scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SharedUtils, CartManager, BottomNavigation, LogoutHandler };
}