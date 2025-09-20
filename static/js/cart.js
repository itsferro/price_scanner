/**
 * Cart Page JavaScript - Cart Management and Proforma Invoice
 */

class CartPage {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadCartData();
    }

    initializeElements() {
        // Cart display elements
        this.emptyCart = document.getElementById('empty-cart');
        this.cartItems = document.getElementById('cart-items');
        this.cartActions = document.getElementById('cart-actions');
        
        // Summary elements
        this.totalItems = document.getElementById('total-items');
        this.totalPrice = document.getElementById('total-price');
        
        // Action buttons
        this.clearCartBtn = document.getElementById('clear-cart-btn');
        this.printInvoiceBtn = document.getElementById('print-invoice-btn');
        
        // Modal elements
        this.clearCartModal = document.getElementById('clear-cart-modal');
        this.confirmClearBtn = document.getElementById('confirm-clear-btn');
        this.cancelClearBtn = document.getElementById('cancel-clear-btn');
        
        // Print elements
        this.printTemplate = document.getElementById('print-template');
        this.printDate = document.getElementById('print-date');
        this.printTime = document.getElementById('print-time');
        this.printItems = document.getElementById('print-items');
        this.printTotalItems = document.getElementById('print-total-items');
        this.printTotalPrice = document.getElementById('print-total-price');
    }

    setupEventListeners() {
        // Action buttons
        this.clearCartBtn?.addEventListener('click', () => this.showClearCartModal());
        this.printInvoiceBtn?.addEventListener('click', () => this.printInvoice());
        
        // Modal actions
        this.confirmClearBtn?.addEventListener('click', () => this.confirmClearCart());
        this.cancelClearBtn?.addEventListener('click', () => this.hideClearCartModal());
        this.clearCartModal?.addEventListener('click', (e) => {
            if (e.target === this.clearCartModal) {
                this.hideClearCartModal();
            }
        });
        
        // Listen for cart updates
        document.addEventListener('cartUpdated', () => this.loadCartData());
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.clearCartModal?.classList.contains('hidden')) {
                this.hideClearCartModal();
            }
        });
    }

    loadCartData() {
        const cart = window.cartManager.getCart();
        const count = window.cartManager.getCartCount();
        const total = window.cartManager.getCartTotal();
        
        this.updateSummary(count, total);
        
        if (cart.length === 0) {
            this.showEmptyState();
        } else {
            this.showCartItems(cart);
        }
    }

    updateSummary(count, total) {
        if (this.totalItems) {
            this.totalItems.textContent = count.toString();
        }
        
        if (this.totalPrice) {
            this.totalPrice.textContent = `${total.toFixed(2)} USD`;
        }
    }

    showEmptyState() {
        this.emptyCart?.classList.remove('hidden');
        this.cartItems?.classList.add('hidden');
        this.cartActions?.classList.add('hidden');
    }

    showCartItems(cart) {
        this.emptyCart?.classList.add('hidden');
        this.cartItems?.classList.remove('hidden');
        this.cartActions?.classList.remove('hidden');
        
        this.renderCartItems(cart);
    }

    renderCartItems(cart) {
        if (!this.cartItems) return;
        
        this.cartItems.innerHTML = '';
        
        cart.forEach(item => {
            const itemElement = this.createCartItemElement(item);
            this.cartItems.appendChild(itemElement);
        });
    }

    createCartItemElement(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.setAttribute('data-barcode', item.barcode);
        
        const itemTotal = (item.price * item.quantity).toFixed(2);
        
        itemDiv.innerHTML = `
            <div class="item-info">
                <h3 class="item-name">${window.sharedUtils.escapeHtml(item.product_name)}</h3>
                <p class="item-description">${window.sharedUtils.escapeHtml(item.description || 'لا يوجد وصف')}</p>
                <code class="item-barcode">الباركود: ${window.sharedUtils.escapeHtml(item.barcode)}</code>
                <div class="item-price">
                    <span class="unit-price">${item.price.toFixed(2)} ${item.currency}</span>
                    <span class="price-separator">×</span>
                    <span class="quantity-display">${item.quantity}</span>
                    <span class="price-separator">=</span>
                    <span class="total-price">${itemTotal} ${item.currency}</span>
                </div>
            </div>
            <div class="item-controls">
                <div class="quantity-controls">
                    <button class="quantity-btn minus-btn" data-action="decrease">−</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="999" data-barcode="${item.barcode}">
                    <button class="quantity-btn plus-btn" data-action="increase">+</button>
                </div>
                <button class="remove-btn" data-barcode="${item.barcode}">
                    <span class="btn-icon">🗑️</span>
                    حذف
                </button>
            </div>
        `;
        
        // Add event listeners for this item
        this.setupItemEventListeners(itemDiv, item);
        
        return itemDiv;
    }

    setupItemEventListeners(itemElement, item) {
        // Quantity controls
        const minusBtn = itemElement.querySelector('.minus-btn');
        const plusBtn = itemElement.querySelector('.plus-btn');
        const quantityInput = itemElement.querySelector('.quantity-input');
        const removeBtn = itemElement.querySelector('.remove-btn');
        
        minusBtn?.addEventListener('click', () => {
            const newQuantity = Math.max(1, item.quantity - 1);
            this.updateItemQuantity(item.barcode, newQuantity);
        });
        
        plusBtn?.addEventListener('click', () => {
            const newQuantity = Math.min(999, item.quantity + 1);
            this.updateItemQuantity(item.barcode, newQuantity);
        });
        
        quantityInput?.addEventListener('change', (e) => {
            let newQuantity = parseInt(e.target.value) || 1;
            newQuantity = Math.max(1, Math.min(999, newQuantity));
            this.updateItemQuantity(item.barcode, newQuantity);
        });
        
        quantityInput?.addEventListener('blur', (e) => {
            // Ensure valid value on blur
            let value = parseInt(e.target.value) || 1;
            value = Math.max(1, Math.min(999, value));
            e.target.value = value;
        });
        
        removeBtn?.addEventListener('click', () => {
            this.removeItem(item.barcode, item.product_name);
        });
    }

    updateItemQuantity(barcode, quantity) {
        window.cartManager.updateQuantity(barcode, quantity);
        window.sharedUtils.showSuccess(`تم تحديث الكمية`);
    }

    removeItem(barcode, productName) {
        window.cartManager.removeProduct(barcode);
        window.sharedUtils.showSuccess(`تم حذف ${productName} من السلة`);
    }

    showClearCartModal() {
        this.clearCartModal?.classList.remove('hidden');
        // Focus on cancel button for accessibility
        setTimeout(() => {
            this.cancelClearBtn?.focus();
        }, 100);
    }

    hideClearCartModal() {
        this.clearCartModal?.classList.add('hidden');
    }

    confirmClearCart() {
        window.cartManager.clearCart();
        this.hideClearCartModal();
        window.sharedUtils.showSuccess('تم مسح جميع العناصر من السلة');
    }

    printInvoice() {
        const cart = window.cartManager.getCart();
        if (cart.length === 0) {
            window.sharedUtils.showError('السلة فارغة - لا يمكن طباعة فاتورة');
            return;
        }
        
        this.preparePrintData(cart);
        
        // Use window.print() to open print dialog
        window.print();
    }

    preparePrintData(cart) {
        // Set current date and time
        const now = new Date();
        const dateStr = now.toLocaleDateString('ar-SA');
        const timeStr = now.toLocaleTimeString('ar-SA');
        
        if (this.printDate) this.printDate.textContent = dateStr;
        if (this.printTime) this.printTime.textContent = timeStr;
        
        // Clear and populate print items
        if (this.printItems) {
            this.printItems.innerHTML = '';
            
            cart.forEach(item => {
                const row = document.createElement('tr');
                const itemTotal = (item.price * item.quantity).toFixed(2);
                
                row.innerHTML = `
                    <td class="item-name-cell">
                        <div class="print-item-name">${window.sharedUtils.escapeHtml(item.product_name)}</div>
                        <div class="print-item-barcode">${window.sharedUtils.escapeHtml(item.barcode)}</div>
                    </td>
                    <td class="quantity-cell">${item.quantity}</td>
                    <td class="price-cell">${item.price.toFixed(2)} ${item.currency}</td>
                    <td class="total-cell">${itemTotal} ${item.currency}</td>
                `;
                
                this.printItems.appendChild(row);
            });
        }
        
        // Update totals
        const totalCount = window.cartManager.getCartCount();
        const totalPrice = window.cartManager.getCartTotal();
        
        if (this.printTotalItems) {
            this.printTotalItems.textContent = totalCount.toString();
        }
        
        if (this.printTotalPrice) {
            this.printTotalPrice.textContent = `${totalPrice.toFixed(2)} USD`;
        }
    }
}

// Initialize cart page when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Cart Page...');
    
    // Initialize bottom navigation
    window.navigation = new BottomNavigation('cart');
    
    // Initialize cart page
    window.cartPage = new CartPage();
});

/**
 * Logout Debug and Test Script
 * Add this to any page to test logout functionality
 */

// Debug function to test logout
function debugLogout() {
    console.log('=== LOGOUT DEBUG TEST ===');
    
    // 1. Check if logout handler exists
    console.log('Logout Handler:', window.logoutHandler);
    
    // 2. Check if logout buttons exist
    const logoutButtons = document.querySelectorAll('#logout-btn, .logout-btn, [data-action="logout"]');
    console.log('Found logout buttons:', logoutButtons.length);
    logoutButtons.forEach((btn, index) => {
        console.log(`Button ${index}:`, btn);
    });
    
    // 3. Check authentication status
    fetch('/api/auth-status')
        .then(response => response.json())
        .then(data => {
            console.log('Auth Status:', data);
        })
        .catch(error => {
            console.error('Auth Status Error:', error);
        });
    
    // 4. Test logout API directly
    console.log('Testing direct logout API call...');
    fetch('/api/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
    })
    .then(response => {
        console.log('Logout API Response Status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Logout API Response Data:', data);
    })
    .catch(error => {
        console.error('Logout API Error:', error);
    });
}

// Auto-run debug if URL contains ?debug=logout
if (window.location.search.includes('debug=logout')) {
    setTimeout(debugLogout, 1000);
}

// Manual trigger function
window.debugLogout = debugLogout;

// Enhanced logout button finder
function findAndFixLogoutButtons() {
    console.log('Finding and fixing logout buttons...');
    
    const selectors = [
        '#logout-btn',
        '.logout-btn',
        '[data-action="logout"]',
        'button[onclick*="logout"]',
        'a[href*="logout"]'
    ];
    
    let foundButtons = 0;
    
    selectors.forEach(selector => {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(button => {
            foundButtons++;
            console.log(`Found button with selector ${selector}:`, button);
            
            // Remove any existing click handlers
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add new click handler
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Logout button clicked!');
                
                if (window.logoutHandler && window.logoutHandler.handleLogout) {
                    window.logoutHandler.handleLogout();
                } else {
                    console.warn('Logout handler not found, using fallback');
                    LogoutHandler.triggerLogout();
                }
            });
        });
    });
    
    console.log(`Total logout buttons found and fixed: ${foundButtons}`);
    return foundButtons;
}

// Auto-fix logout buttons every 2 seconds (for debugging)
let buttonFixInterval;
function startButtonFixer() {
    buttonFixInterval = setInterval(() => {
        const count = findAndFixLogoutButtons();
        if (count > 0) {
            console.log(`Fixed ${count} logout buttons`);
        }
    }, 2000);
}

function stopButtonFixer() {
    if (buttonFixInterval) {
        clearInterval(buttonFixInterval);
        buttonFixInterval = null;
    }
}

// Export functions for manual testing
window.findAndFixLogoutButtons = findAndFixLogoutButtons;
window.startButtonFixer = startButtonFixer;
window.stopButtonFixer = stopButtonFixer;

// Quick test function
window.testLogout = function() {
    console.log('Quick logout test...');
    if (window.logoutHandler) {
        window.logoutHandler.handleLogout();
    } else if (window.LogoutHandler) {
        window.LogoutHandler.triggerLogout();
    } else {
        console.error('No logout handler found!');
        // Direct API call
        fetch('/api/logout', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                console.log('Direct logout result:', data);
                if (data.success) {
                    window.location.href = '/login';
                }
            })
            .catch(error => {
                console.error('Direct logout failed:', error);
                window.location.href = '/login';
            });
    }
};

console.log('Logout debug script loaded. Available functions:');
console.log('- debugLogout() - Run full debug test');
console.log('- findAndFixLogoutButtons() - Find and fix logout buttons');
console.log('- testLogout() - Quick logout test');
console.log('- startButtonFixer() - Auto-fix buttons every 2 seconds');
console.log('- stopButtonFixer() - Stop auto-fixer');