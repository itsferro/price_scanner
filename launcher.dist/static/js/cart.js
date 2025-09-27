/**
 * CART.JS - Cart Page Specific JavaScript (Updated with Scannable Barcodes)
 * Clean, focused cart management functionality with POS-ready barcode display
 */

class CartPage {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadCartData();
        console.log('CartPage initialized');
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
        
        // Modal overlay click to close
        this.clearCartModal?.addEventListener('click', (e) => {
            if (e.target === this.clearCartModal) {
                this.hideClearCartModal();
            }
        });
        
        // Listen for cart updates from other pages
        document.addEventListener('cartUpdated', () => {
            this.loadCartData();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.clearCartModal?.classList.contains('hidden')) {
                this.hideClearCartModal();
            }
        });
    }

    loadCartData() {
        if (!window.cartManager) {
            console.warn('Cart manager not available');
            this.showEmptyState();
            return;
        }
        
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
        
        // Stock display
        const stockDisplay = item.stock_qty !== undefined && item.stock_qty !== null ? 
            `<div class="item-stock">المخزون: ${item.stock_qty} قطعة</div>` : '';
        
        // Generate unique ID for barcode canvas
        const barcodeId = `barcode-${item.barcode.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;
        
        itemDiv.innerHTML = `
            <div class="item-info">
                <h3 class="item-name">${this.escapeHtml(item.product_name)}</h3>
                ${stockDisplay}
                
                <!-- Scannable Barcode Section -->
                <div class="barcode-section">
                    <div class="barcode-header">
                        <h4 class="barcode-title">
                            <i class="fas fa-qrcode"></i>
                            باركود للمسح السريع - POS Ready
                        </h4>
                        <p class="barcode-subtitle">يمكن لموظف نقطة البيع مسح هذا الباركود مباشرة</p>
                    </div>
                    <div class="barcode-container">
                        <canvas id="${barcodeId}" class="barcode-canvas"></canvas>
                        <div class="barcode-text">${this.escapeHtml(item.barcode)}</div>
                    </div>
                </div>
                
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
                    <button class="quantity-btn minus-btn" data-action="decrease">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="999" data-barcode="${item.barcode}">
                    <button class="quantity-btn plus-btn" data-action="increase">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <button class="remove-btn" data-barcode="${item.barcode}">
                    <span class="btn-icon"><i class="fas fa-trash-alt"></i></span>
                    حذف
                </button>
            </div>
        `;
        
        // Add event listeners for this item
        this.setupItemEventListeners(itemDiv, item);
        
        // Generate the barcode after the element is added to DOM
        setTimeout(() => this.generateBarcode(barcodeId, item.barcode), 100);
        
        return itemDiv;
    }

    generateBarcode(canvasId, barcodeValue) {
        try {
            // Check if JsBarcode is available
            if (typeof JsBarcode === 'undefined') {
                console.warn('JsBarcode library not loaded, barcode generation skipped');
                return;
            }

            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.warn(`Canvas ${canvasId} not found, skipping barcode generation`);
                return;
            }

            // Generate barcode with optimal settings for POS scanning
            JsBarcode(canvas, barcodeValue, {
                format: "CODE128", // Universal format supported by most POS systems
                width: 2,          // Line width
                height: 60,        // Barcode height
                displayValue: false, // We show the text separately
                margin: 10,        // Margin around barcode
                fontSize: 0,       // No font in barcode itself
                background: "#ffffff", // White background
                lineColor: "#000000"   // Black lines
            });

            console.log(`Generated barcode for: ${barcodeValue}`);
            
        } catch (error) {
            console.error('Error generating barcode:', error);
            // Hide the barcode section if generation fails
            const barcodeSection = document.getElementById(canvasId)?.closest('.barcode-section');
            if (barcodeSection) {
                barcodeSection.style.display = 'none';
            }
        }
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
            // Check stock limit if available
            const maxQuantity = item.stock_qty ? Math.min(999, item.stock_qty) : 999;
            const newQuantity = Math.min(maxQuantity, item.quantity + 1);
            
            if (item.stock_qty && newQuantity > item.stock_qty) {
                window.sharedUtils?.showError(`الكمية المطلوبة تتجاوز المخزون المتاح (${item.stock_qty})`);
                return;
            }
            
            this.updateItemQuantity(item.barcode, newQuantity);
        });
        
        quantityInput?.addEventListener('change', (e) => {
            let newQuantity = parseInt(e.target.value) || 1;
            
            // Check stock limit if available
            if (item.stock_qty && newQuantity > item.stock_qty) {
                window.sharedUtils?.showError(`الكمية المطلوبة تتجاوز المخزون المتاح (${item.stock_qty})`);
                newQuantity = item.stock_qty;
                e.target.value = newQuantity;
            }
            
            newQuantity = Math.max(1, Math.min(999, newQuantity));
            this.updateItemQuantity(item.barcode, newQuantity);
        });
        
        quantityInput?.addEventListener('blur', (e) => {
            // Ensure valid value on blur
            let value = parseInt(e.target.value) || 1;
            const maxQuantity = item.stock_qty ? Math.min(999, item.stock_qty) : 999;
            value = Math.max(1, Math.min(maxQuantity, value));
            e.target.value = value;
        });
        
        removeBtn?.addEventListener('click', () => {
            this.removeItem(item.barcode, item.product_name);
        });
    }

    updateItemQuantity(barcode, quantity) {
        if (window.cartManager) {
            window.cartManager.updateQuantity(barcode, quantity);
            window.sharedUtils?.showSuccess('تم تحديث الكمية');
        }
    }

    removeItem(barcode, productName) {
        if (window.cartManager) {
            window.cartManager.removeProduct(barcode);
            window.sharedUtils?.showSuccess(`تم حذف ${productName} من السلة`);
        }
    }

    showClearCartModal() {
        this.clearCartModal?.classList.remove('hidden');
        setTimeout(() => this.cancelClearBtn?.focus(), 100);
    }

    hideClearCartModal() {
        this.clearCartModal?.classList.add('hidden');
    }

    confirmClearCart() {
        if (window.cartManager) {
            window.cartManager.clearCart();
            this.hideClearCartModal();
            window.sharedUtils?.showSuccess('تم مسح جميع العناصر من السلة');
        }
    }

    printInvoice() {
        const cart = window.cartManager?.getCart() || [];
        
        if (cart.length === 0) {
            window.sharedUtils?.showError('السلة فارغة - لا يمكن طباعة فاتورة');
            return;
        }
        
        this.preparePrintData(cart);
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
            
            cart.forEach((item, index) => {
                const row = document.createElement('tr');
                const itemTotal = (item.price * item.quantity).toFixed(2);
                
                // Create a small barcode for printing
                const printBarcodeId = `print-barcode-${index}`;
                
                row.innerHTML = `
                    <td class="item-name-cell">
                        <div class="print-item-name">${this.escapeHtml(item.product_name)}</div>
                        <div class="print-barcode-container">
                            <canvas id="${printBarcodeId}" class="print-barcode"></canvas>
                        </div>
                        <div class="print-item-barcode">${this.escapeHtml(item.barcode)}</div>
                    </td>
                    <td class="quantity-cell">${item.quantity}</td>
                    <td class="price-cell">${item.price.toFixed(2)} ${item.currency}</td>
                    <td class="total-cell">${itemTotal} ${item.currency}</td>
                `;
                
                this.printItems.appendChild(row);
                
                // Generate small barcode for printing
                setTimeout(() => this.generatePrintBarcode(printBarcodeId, item.barcode), 100);
            });
        }
        
        // Update totals
        const totalCount = window.cartManager?.getCartCount() || 0;
        const totalPrice = window.cartManager?.getCartTotal() || 0;
        
        if (this.printTotalItems) {
            this.printTotalItems.textContent = totalCount.toString();
        }
        
        if (this.printTotalPrice) {
            this.printTotalPrice.textContent = `${totalPrice.toFixed(2)} USD`;
        }
    }

    generatePrintBarcode(canvasId, barcodeValue) {
        try {
            if (typeof JsBarcode === 'undefined') return;

            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            // Generate smaller barcode for print
            JsBarcode(canvas, barcodeValue, {
                format: "CODE128",
                width: 1,          // Thinner lines for print
                height: 30,        // Smaller height for print
                displayValue: false,
                margin: 5,
                fontSize: 0,
                background: "#ffffff",
                lineColor: "#000000"
            });

        } catch (error) {
            console.error('Error generating print barcode:', error);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize cart page when DOM loads and common utils are ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cart page initializing...');
    
    try {
        // Wait for common utilities
        await window.waitForCommonUtils();
        
        // Initialize navigation and cart page
        window.navigation = new BottomNavigation('cart');
        window.cartPage = new CartPage();
        
        console.log('Cart page initialized successfully');
        
    } catch (error) {
        console.error('Error initializing cart page:', error);
        window.sharedUtils?.showError('خطأ في تحميل صفحة السلة');
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.cartPage) {
        window.cartPage.loadCartData();
    }
});