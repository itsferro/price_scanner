/**
 * Shared Navigation and Utilities for Price Scanner System
 * Updated to handle products without description field and fixed cart badge logic
 */

// ==================== SHARED UTILITIES ====================

class SharedUtils {
    constructor() {
        this.initializeElements();
        this.setupCommonEventListeners();
    }

    initializeElements() {
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
        if (!text) return '';
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

/**
 * Fixed Bottom Navigation Class - Always Show Cart Badge with True Count
 */

class BottomNavigation {
    constructor(currentPage) {
        this.currentPage = currentPage;
        this.initializeNavigation();
        this.setupEventListeners();
        
        // Initialize badge immediately with current cart count
        this.initializeCartBadge();
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

    initializeCartBadge() {
        // Wait for cart manager to be ready, then update badge
        const updateBadgeWhenReady = () => {
            if (window.cartManager) {
                const count = window.cartManager.getCartCount();
                this.updateCartBadge(count);
                console.log('Navigation initialized with cart count:', count);
            } else {
                // Retry after a short delay
                setTimeout(updateBadgeWhenReady, 100);
            }
        };
        
        updateBadgeWhenReady();
    }

    updateCartBadge(count) {
        const cartBadge = document.getElementById('cart-badge');
        if (cartBadge) {
            // ALWAYS show the actual count - never reset or hide
            cartBadge.textContent = count > 99 ? '99+' : count.toString();
            
            // Update visual styling based on count
            cartBadge.classList.remove('cart-empty', 'cart-has-items');
            
            if (count === 0) {
                cartBadge.classList.add('cart-empty');
            } else {
                cartBadge.classList.add('cart-has-items');
            }
            
            // Badge is ALWAYS visible - no hiding logic whatsoever
            cartBadge.classList.remove('hidden');
            cartBadge.style.display = 'flex'; // Ensure it's always displayed
            
            console.log(`Cart badge updated: ${count} items, classes: ${cartBadge.className}`);
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
                btn.innerHTML = '<span class="logout-icon"><i class="fas fa-spinner fa-spin"></i></span>جاري تسجيل الخروج...';
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

/**
 * Fixed Cart Manager - Always Update Badge with True Count
 */

class CartManager {
    constructor() {
        this.storageKey = 'priceScanner_cart';
        this.cart = this.loadCart();
        this.setupStorageListener();
        
        // Always update display on initialization
        this.updateCartDisplay();
        
        console.log('CartManager initialized with cart:', this.cart);
        console.log('Initial cart count:', this.getCartCount());
    }

    loadCart() {
        try {
            if (typeof(Storage) === "undefined") {
                console.warn('localStorage not supported, using memory storage');
                return [];
            }

            const saved = localStorage.getItem(this.storageKey);
            const cart = saved ? JSON.parse(saved) : [];
            console.log('Loaded cart from storage:', cart);
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
                console.log('Cart saved to storage:', this.cart);
            }
            
            // ALWAYS update display after saving
            this.updateCartDisplay();
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    setupStorageListener() {
        if (typeof(Storage) !== "undefined") {
            window.addEventListener('storage', (e) => {
                if (e.key === this.storageKey) {
                    this.cart = e.newValue ? JSON.parse(e.newValue) : [];
                    this.updateCartDisplay();
                    console.log('Cart updated from storage event:', this.cart);
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

            if (!Array.isArray(this.cart)) {
                this.cart = [];
            }

            const existingIndex = this.cart.findIndex(item => item.barcode === product.barcode);
            
            if (existingIndex >= 0) {
                this.cart[existingIndex].quantity += quantity;
                console.log(`Updated existing product ${product.barcode}, new quantity: ${this.cart[existingIndex].quantity}`);
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
                console.log('Added new product to cart:', cartItem);
            }
            
            this.saveCart(); // This will call updateCartDisplay()
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
                this.saveCart(); // This will call updateCartDisplay()
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
                    this.saveCart(); // This will call updateCartDisplay()
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
            this.saveCart(); // This will call updateCartDisplay()
            console.log('Cart cleared - badge should show 0');
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
            const count = this.cart.reduce((total, item) => total + (item.quantity || 0), 0);
            return count;
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

    updateCartDisplay() {
        try {
            const count = this.getCartCount();
            
            console.log(`Updating cart display - Count: ${count}`);
            
            // ALWAYS update navigation badge with true count
            if (window.navigation) {
                window.navigation.updateCartBadge(count);
            } else {
                console.warn('Navigation not available yet, will retry...');
                // Retry after navigation is ready
                setTimeout(() => {
                    if (window.navigation) {
                        window.navigation.updateCartBadge(count);
                    }
                }, 100);
            }

            // Update cart status for tooltip
            const cartNavItem = document.querySelector('.nav-item[data-page="cart"]');
            if (cartNavItem) {
                if (count === 0) {
                    cartNavItem.setAttribute('data-cart-status', 'السلة فارغة');
                } else {
                    cartNavItem.setAttribute('data-cart-status', `${count} عنصر في السلة`);
                }
            }

            // Dispatch event for other components
            const event = new CustomEvent('cartUpdated', {
                detail: { 
                    count: count, 
                    total: this.getCartTotal(), 
                    cart: this.getCart() 
                }
            });
            document.dispatchEvent(event);
            
            console.log(`Cart display updated - Count: ${count}, Total: ${this.getCartTotal()}`);
        } catch (error) {
            console.error('Error updating cart display:', error);
        }
    }

    // Method to force badge update (useful for debugging)
    refreshBadge() {
        const count = this.getCartCount();
        console.log('Force refreshing badge with count:', count);
        
        if (window.navigation) {
            window.navigation.updateCartBadge(count);
        }
        
        // Also update badge directly if navigation method fails
        const cartBadge = document.getElementById('cart-badge');
        if (cartBadge) {
            cartBadge.textContent = count > 99 ? '99+' : count.toString();
            cartBadge.classList.remove('cart-empty', 'cart-has-items');
            cartBadge.classList.add(count === 0 ? 'cart-empty' : 'cart-has-items');
            cartBadge.classList.remove('hidden');
            cartBadge.style.display = 'flex';
        }
    }

    // Debug method
    debugCart() {
        console.log('=== CART DEBUG ===');
        console.log('Cart items:', this.cart);
        console.log('Cart count:', this.getCartCount());
        console.log('Cart total:', this.getCartTotal());
        console.log('Storage key:', this.storageKey);
        console.log('localStorage value:', localStorage.getItem(this.storageKey));
        
        const cartBadge = document.getElementById('cart-badge');
        if (cartBadge) {
            console.log('Cart badge element:', cartBadge);
            console.log('Cart badge text:', cartBadge.textContent);
            console.log('Cart badge classes:', cartBadge.className);
            console.log('Cart badge display style:', cartBadge.style.display);
        }
        
        // Force refresh badge
        this.refreshBadge();
    }
}

// ==================== INITIALIZATION WITH PROPER SEQUENCING ====================

// Global initialization flag
window.sharedUtilsReady = false;

// Enhanced initialization to ensure proper order
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing shared utilities with cart badge fix...');
    
    try {
        // Initialize shared utilities first
        window.sharedUtils = new SharedUtils();
        
        // Initialize cart manager second
        window.cartManager = new CartManager();
        
        // Set ready flag
        window.sharedUtilsReady = true;
        
        // Dispatch ready event
        document.dispatchEvent(new CustomEvent('sharedUtilsReady'));
        
        // Initialize logout handler
        setTimeout(() => {
            window.logoutHandler = new LogoutHandler();
        }, 100);
        
        console.log('Shared utilities initialized successfully');
        
        // Debug cart state
        setTimeout(() => {
            if (window.cartManager) {
                console.log('Post-initialization cart debug:');
                window.cartManager.debugCart();
            }
        }, 500);
        
    } catch (error) {
        console.error('Error initializing shared utilities:', error);
    }
});

// Page-specific navigation initialization
window.addEventListener('load', () => {
    // Ensure cart badge is updated on every page load
    if (window.cartManager && window.navigation) {
        const count = window.cartManager.getCartCount();
        window.navigation.updateCartBadge(count);
        console.log('Page load: Updated cart badge with count:', count);
    }
    
    if (!window.logoutHandler) {
        console.log('Initializing logout handler on window load...');
        window.logoutHandler = new LogoutHandler();
    }
});

// Utility function to wait for shared utils to be ready
window.waitForSharedUtils = function() {
    return new Promise((resolve) => {
        if (window.sharedUtilsReady && window.cartManager) {
            resolve();
        } else {
            document.addEventListener('sharedUtilsReady', () => {
                resolve();
            }, { once: true });
        }
    });
};

// Global function to force cart badge refresh (for debugging)
window.refreshCartBadge = function() {
    if (window.cartManager) {
        window.cartManager.refreshBadge();
    } else {
        console.error('Cart manager not available');
    }
};

// Global function to debug cart state
window.debugCartState = function() {
    if (window.cartManager) {
        window.cartManager.debugCart();
    } else {
        console.error('Cart manager not available');
    }
};

// Export for use in other files
window.SharedUtils = SharedUtils;
window.BottomNavigation = BottomNavigation;
window.CartManager = CartManager;
window.LogoutHandler = LogoutHandler;