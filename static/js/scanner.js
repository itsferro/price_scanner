/**
 * Scanner Page JavaScript - Mobile-First Full Screen Design with Fixed Cart Integration
 * Updated to display stock quantity and remove description
 * Added: Click outside product card to close it
 */

class ScannerPage {
    constructor() {
        this.html5QrCode = null;
        this.isScanning = false;
        this.lastScanTime = 0;
        this.scanCooldown = 2000; // 2 seconds between scans
        this.currentProduct = null;
        this.availableCameras = [];
        this.currentCameraIndex = 0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkMobilePermissions();
        this.waitForCartManager();
    }

    async waitForCartManager() {
        // Wait for shared utils to be ready
        if (typeof window.waitForSharedUtils === 'function') {
            await window.waitForSharedUtils();
        }
        
        // Double-check cart manager is available
        if (!window.cartManager) {
            console.warn('Cart manager not available, creating fallback');
            // Create a simple fallback if needed
            window.cartManager = {
                addProduct: () => {
                    console.error('Cart manager not properly initialized');
                    return false;
                }
            };
        }
        
        console.log('Scanner page ready with cart manager:', !!window.cartManager);
    }

    checkMobilePermissions() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
        
        if (isMobile && location.protocol !== 'https:') {
            window.sharedUtils?.showError('يتطلب الوصول للكاميرا استخدام HTTPS على الأجهزة المحمولة');
            return false;
        }
        return true;
    }

    initializeElements() {
        // Scanner controls
        this.startBtn = document.getElementById('start-camera');
        this.stopBtn = document.getElementById('stop-camera');
        this.switchCameraBtn = document.getElementById('switch-camera');
        this.searchBtn = document.getElementById('search-manual');
        this.manualInput = document.getElementById('manual-barcode');
        
        // Display elements
        this.scannerContainer = document.getElementById('camera-container');
        this.scannerStatus = document.getElementById('scanner-status');
        this.emptyState = document.getElementById('empty-state');
        this.cameraControlsOverlay = document.getElementById('camera-controls-overlay');
        
        // Layout elements
        this.scannerHeader = document.getElementById('scanner-header');
        this.manualSearchBar = document.getElementById('manual-search-bar');
        this.bottomNav = document.getElementById('bottom-nav');
        
        // Product result elements
        this.productResult = document.getElementById('product-result');
        this.productName = document.getElementById('product-name');
        this.productPrice = document.getElementById('product-price');
        this.productStock = document.getElementById('product-stock'); // New stock element
        this.productBarcode = document.getElementById('product-barcode');
        this.closeResultBtn = document.getElementById('close-result');
        
        // Add to cart elements
        this.quantityInput = document.getElementById('product-quantity');
        this.quantityMinusBtn = document.getElementById('quantity-minus');
        this.quantityPlusBtn = document.getElementById('quantity-plus');
        this.addToCartBtn = document.getElementById('add-to-cart-btn');
    }

    setupEventListeners() {
        // Scanner controls
        this.startBtn?.addEventListener('click', () => this.startScanner());
        this.stopBtn?.addEventListener('click', () => this.stopScanner());
        this.switchCameraBtn?.addEventListener('click', () => this.switchCamera());
        
        // Manual search
        this.searchBtn?.addEventListener('click', () => this.searchManualBarcode());
        this.manualInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchManualBarcode();
            }
        });

        // Product result
        this.closeResultBtn?.addEventListener('click', () => this.hideProductResult());
        
        // Close product card when clicking outside of it
        document.addEventListener('click', (e) => {
            if (this.currentProduct && !this.productResult?.classList.contains('hidden')) {
                if (!e.target.closest('#product-result')) {
                    this.hideProductResult();
                }
            }
        });
        
        // Quantity controls
        this.quantityMinusBtn?.addEventListener('click', () => this.adjustQuantity(-1));
        this.quantityPlusBtn?.addEventListener('click', () => this.adjustQuantity(1));
        this.quantityInput?.addEventListener('change', () => this.validateQuantity());
        this.quantityInput?.addEventListener('blur', () => this.validateQuantity());
        
        // Add to cart - Enhanced with better error handling
        this.addToCartBtn?.addEventListener('click', () => this.addToCart());

        // Focus manual input initially
        setTimeout(() => {
            this.manualInput?.focus();
        }, 100);
    }

    async startScanner() {
        try {
            window.sharedUtils?.hideError();
            this.hideProductResult();
            
            this.showStatus('جاري تشغيل الكاميرا...');
            
            // Enter full-screen camera mode
            this.enterFullScreenMode();
            
            this.html5QrCode = new Html5Qrcode("qr-reader");
            
            // Get available cameras
            this.availableCameras = await Html5Qrcode.getCameras();
            if (this.availableCameras.length === 0) {
                throw new Error('لا توجد كاميرات متاحة');
            }

            // Use back camera by default, or first available
            const backCamera = this.availableCameras.find(camera => 
                camera.label.toLowerCase().includes('back') || 
                camera.label.toLowerCase().includes('rear')
            );
            
            const cameraId = backCamera?.id || this.availableCameras[3].id;
            this.currentCameraIndex = this.availableCameras.findIndex(cam => cam.id === cameraId);

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await this.html5QrCode.start(
                cameraId,
                config,
                (decodedText) => this.onScanSuccess(decodedText),
                (error) => this.onScanError(error)
            );

            this.isScanning = true;
            this.showStatus('وجه الكاميرا نحو الباركود');

            // Enable switch camera button if multiple cameras available
            if (this.availableCameras.length > 1) {
                this.switchCameraBtn?.classList.remove('hidden');
            }

        } catch (error) {
            console.error('Scanner error:', error);
            window.sharedUtils?.showError(`خطأ في الكاميرا: ${error.message}`);
            this.exitFullScreenMode();
        }
    }

    async stopScanner() {
        try {
            if (this.html5QrCode && this.isScanning) {
                await this.html5QrCode.stop();
                this.html5QrCode.clear();
            }
            
            this.isScanning = false;
            this.exitFullScreenMode();
            
        } catch (error) {
            console.error('Stop scanner error:', error);
            this.exitFullScreenMode();
        }
    }

    async switchCamera() {
        if (!this.isScanning || this.availableCameras.length <= 1) return;
        
        try {
            // Stop current camera
            await this.html5QrCode.stop();
            
            // Switch to next camera
            this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
            const nextCamera = this.availableCameras[this.currentCameraIndex];
            
            this.showStatus('جاري تبديل الكاميرا...');
            
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await this.html5QrCode.start(
                nextCamera.id,
                config,
                (decodedText) => this.onScanSuccess(decodedText),
                (error) => this.onScanError(error)
            );
            
            this.showStatus('وجه الكاميرا نحو الباركود');
            
        } catch (error) {
            console.error('Switch camera error:', error);
            window.sharedUtils?.showError('فشل في تبديل الكاميرا');
        }
    }

    async onScanSuccess(decodedText) {
        const now = Date.now();
        if (now - this.lastScanTime < this.scanCooldown) {
            return;
        }
        this.lastScanTime = now;

        console.log('Scanned barcode:', decodedText);
        this.showStatus(`تم المسح: ${decodedText}`);
        
        // Auto-stop scanner after successful scan
        await this.stopScanner();
        
        // Fill manual input and search
        if (this.manualInput) {
            this.manualInput.value = decodedText;
        }
        
        this.searchProduct(decodedText);
    }

    onScanError(error) {
        if (!error.includes('No QR code found')) {
            console.log('Scan error:', error);
        }
    }

    async searchManualBarcode() {
        const barcode = this.manualInput?.value.trim();
        
        if (!barcode) {
            window.sharedUtils?.showError('يرجى إدخال رقم الباركود');
            this.manualInput?.focus();
            return;
        }

        console.log('Manual search for:', barcode);
        await this.searchProduct(barcode);
    }

    async searchProduct(barcode) {
        try {
            window.sharedUtils?.showLoading();
            window.sharedUtils?.hideError();
            this.hideProductResult();

            const response = await window.sharedUtils?.apiCall(`/api/price/${encodeURIComponent(barcode)}`);
            
            if (!response) return; // Auth redirect handled by apiCall
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('المنتج غير موجود');
                } else {
                    throw new Error(`خطأ في الخادم: ${response.status}`);
                }
            }

            const product = await response.json();
            this.displayProduct(product);

        } catch (error) {
            console.error('Search error:', error);
            window.sharedUtils?.showError(error.message);
        } finally {
            window.sharedUtils?.hideLoading();
        }
    }

    displayProduct(product) {
        this.currentProduct = product;
        
        if (!this.productName) return;

        // Display product information - updated to show stock instead of description
        this.productName.textContent = window.sharedUtils?.escapeHtml(product.product_name) || product.product_name;
        
        if (this.productPrice) {
            this.productPrice.textContent = `${product.price.toFixed(2)} ${product.currency}`;
        }
        
        // Display stock information with color coding
        if (this.productStock) {
            const stockQty = product.stock_qty || 0;
            this.productStock.textContent = `${stockQty} قطعة`;
            
            // Add stock status styling
            this.productStock.classList.remove('stock-low', 'stock-medium', 'stock-high', 'stock-out');
            if (stockQty === 0) {
                this.productStock.classList.add('stock-out');
            } else if (stockQty <= 10) {
                this.productStock.classList.add('stock-low');
            } else if (stockQty <= 50) {
                this.productStock.classList.add('stock-medium');
            } else {
                this.productStock.classList.add('stock-high');
            }
        }
        
        if (this.productBarcode) {
            this.productBarcode.textContent = `الباركود: ${window.sharedUtils?.escapeHtml(product.barcode) || product.barcode}`;
        }

        // Reset quantity to 1 and limit based on stock
        if (this.quantityInput) {
            this.quantityInput.value = 1;
            this.quantityInput.max = Math.min(999, product.stock_qty || 999);
        }

        // Disable add to cart if out of stock
        if (this.addToCartBtn) {
            if (product.stock_qty && product.stock_qty > 0) {
                this.addToCartBtn.disabled = false;
                this.addToCartBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-shopping-cart"></i></span>إضافة للسلة';
            } else {
                this.addToCartBtn.disabled = true;
                this.addToCartBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-times"></i></span>غير متوفر';
            }
        }

        this.productResult?.classList.remove('hidden');

        // Clear manual input
        if (this.manualInput) {
            this.manualInput.value = '';
        }
        
        console.log('Product displayed:', product);
    }

    hideProductResult() {
        this.productResult?.classList.add('hidden');
        this.currentProduct = null;
    }

    adjustQuantity(delta) {
        if (!this.quantityInput) return;
        
        const currentValue = parseInt(this.quantityInput.value) || 1;
        const maxStock = parseInt(this.quantityInput.max) || 999;
        const newValue = Math.max(1, Math.min(maxStock, currentValue + delta));
        this.quantityInput.value = newValue;
    }

    validateQuantity() {
        if (!this.quantityInput) return;
        
        const maxStock = parseInt(this.quantityInput.max) || 999;
        let value = parseInt(this.quantityInput.value) || 1;
        value = Math.max(1, Math.min(maxStock, value));
        this.quantityInput.value = value;
    }

    async addToCart() {
        console.log('Add to cart clicked');
        
        if (!this.currentProduct) {
            console.error('No current product to add');
            window.sharedUtils?.showError('لا يوجد منتج محدد للإضافة');
            return;
        }

        // Check if product is in stock
        if (!this.currentProduct.stock_qty || this.currentProduct.stock_qty <= 0) {
            window.sharedUtils?.showError('المنتج غير متوفر في المخزن');
            return;
        }

        // Wait for cart manager if not ready
        if (!window.cartManager) {
            console.log('Cart manager not ready, waiting...');
            try {
                await window.waitForSharedUtils();
            } catch (error) {
                console.error('Failed to wait for cart manager:', error);
            }
        }

        if (!window.cartManager) {
            console.error('Cart manager still not available');
            window.sharedUtils?.showError('نظام السلة غير متاح حالياً');
            return;
        }

        try {
            const quantity = parseInt(this.quantityInput?.value) || 1;
            const maxStock = this.currentProduct.stock_qty || 0;
            
            // Validate quantity against stock
            if (quantity < 1 || quantity > maxStock) {
                window.sharedUtils?.showError(`الكمية يجب أن تكون بين 1 و ${maxStock}`);
                return;
            }

            console.log('Adding to cart:', {
                product: this.currentProduct,
                quantity: quantity
            });

            // Disable button during operation
            if (this.addToCartBtn) {
                this.addToCartBtn.disabled = true;
                const originalText = this.addToCartBtn.innerHTML;
                this.addToCartBtn.innerHTML = '<span class="btn-icon">⏳</span>جاري الإضافة...';
                
                // Re-enable button after operation
                setTimeout(() => {
                    this.addToCartBtn.disabled = false;
                    this.addToCartBtn.innerHTML = originalText;
                }, 1000);
            }

            const success = window.cartManager.addProduct(this.currentProduct, quantity);
            
            if (success) {
                const productName = this.currentProduct.product_name || 'المنتج';
                window.sharedUtils?.showSuccess(`تم إضافة ${quantity} ${productName} إلى السلة`);
                this.hideProductResult();
                
                // Focus manual input for next scan
                setTimeout(() => {
                    this.manualInput?.focus();
                }, 100);
                
                console.log('Product added to cart successfully');
                
                // Debug cart state
                if (window.cartManager.debugCart) {
                    window.cartManager.debugCart();
                }
            } else {
                throw new Error('فشل في إضافة المنتج إلى السلة');
            }
        } catch (error) {
            console.error('Add to cart error:', error);
            window.sharedUtils?.showError('فشل في إضافة المنتج إلى السلة: ' + error.message);
        }
    }

    enterFullScreenMode() {
        // Hide header, navigation, and manual search
        this.scannerHeader?.classList.add('hidden');
        this.bottomNav?.classList.add('hidden');
        this.manualSearchBar?.classList.add('hidden');
        
        // Show camera container and controls overlay
        this.scannerContainer?.classList.remove('hidden');
        this.cameraControlsOverlay?.classList.remove('hidden');
        this.emptyState?.classList.add('hidden');
        
        // Make camera container full screen
        this.scannerContainer?.classList.add('fullscreen-camera');
    }

    exitFullScreenMode() {
        // Show header, navigation, and manual search
        this.scannerHeader?.classList.remove('hidden');
        this.bottomNav?.classList.remove('hidden');
        this.manualSearchBar?.classList.remove('hidden');
        
        // Hide camera container and controls overlay
        this.scannerContainer?.classList.add('hidden');
        this.cameraControlsOverlay?.classList.add('hidden');
        this.emptyState?.classList.remove('hidden');
        
        // Remove full screen class
        this.scannerContainer?.classList.remove('fullscreen-camera');
        this.switchCameraBtn?.classList.add('hidden');
    }

    showStatus(message) {
        if (this.scannerStatus) {
            this.scannerStatus.textContent = window.sharedUtils?.escapeHtml(message) || message;
        }
    }

    // Debug method for testing
    debugAddToCart() {
        console.log('=== ADD TO CART DEBUG ===');
        console.log('Current product:', this.currentProduct);
        console.log('Quantity input value:', this.quantityInput?.value);
        console.log('Cart manager available:', !!window.cartManager);
        console.log('Shared utils available:', !!window.sharedUtils);
        console.log('Add to cart button:', this.addToCartBtn);
        
        if (window.cartManager && window.cartManager.debugCart) {
            window.cartManager.debugCart();
        }
    }
}

// Initialize scanner page when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Scanner Page...');
    
    try {
        // Wait for shared utilities to be ready
        if (typeof window.waitForSharedUtils === 'function') {
            await window.waitForSharedUtils();
        }
        
        // Initialize bottom navigation
        window.navigation = new BottomNavigation('scanner');
        
        // Initialize scanner page
        window.scannerPage = new ScannerPage();
        
        console.log('Scanner page initialized successfully');
    } catch (error) {
        console.error('Error initializing scanner page:', error);
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.scannerPage && window.scannerPage.isScanning) {
        if (document.hidden) {
            console.log('Page hidden, pausing scanner');
        } else {
            console.log('Page visible, resuming scanner');
        }
    }
});

// Debug function for testing cart functionality
window.testCartFunctionality = function() {
    console.log('=== CART FUNCTIONALITY TEST ===');
    
    if (!window.cartManager) {
        console.error('Cart manager not available');
        return;
    }
    
    // Test adding a mock product with stock
    const mockProduct = {
        barcode: 'TEST123',
        product_name: 'Test Product',
        price: 10.50,
        stock_qty: 25,
        currency: 'USD'
    };
    
    console.log('Adding mock product:', mockProduct);
    const success = window.cartManager.addProduct(mockProduct, 2);
    console.log('Add result:', success);
    
    // Debug cart state
    if (window.cartManager.debugCart) {
        window.cartManager.debugCart();
    }
};

// Export debug function
window.debugScannerPage = function() {
    if (window.scannerPage && window.scannerPage.debugAddToCart) {
        window.scannerPage.debugAddToCart();
    } else {
        console.error('Scanner page not available');
    }
};

console.log('Scanner page script loaded. Debug functions available:');
console.log('- testCartFunctionality() - Test cart with mock product');
console.log('- debugScannerPage() - Debug current scanner state');