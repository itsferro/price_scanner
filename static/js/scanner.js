/**
 * Scanner Page JavaScript - FIXED: iOS Camera Permission Issue
 * Fix: Reuse Html5Qrcode instance and properly manage camera permissions
 */

class ScannerPage {
    constructor() {
        this.html5QrCode = null; // Will be initialized once and reused
        this.isScanning = false;
        this.lastScanTime = 0;
        this.scanCooldown = 2000;
        this.currentProduct = null;
        this.availableCameras = [];
        this.currentCameraIndex = 0;
        this.permissionGranted = false; // Track permission state
        this.currentStream = null; // Track active stream
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkMobilePermissions();
        this.waitForCartManager();
        
        // Initialize Html5Qrcode instance once
        this.initializeScanner();
    }

    async waitForCartManager() {
        if (typeof window.waitForSharedUtils === 'function') {
            await window.waitForSharedUtils();
        }
        
        if (!window.cartManager) {
            console.warn('Cart manager not available, creating fallback');
            window.cartManager = {
                addProduct: () => {
                    console.error('Cart manager not properly initialized');
                    return false;
                }
            };
        }
        
        console.log('Scanner page ready with cart manager:', !!window.cartManager);
    }

    // FIXED: Initialize scanner instance once and reuse it
    initializeScanner() {
        try {
            if (!this.html5QrCode) {
                this.html5QrCode = new Html5Qrcode("qr-reader");
                console.log('Html5Qrcode instance initialized');
            }
        } catch (error) {
            console.error('Failed to initialize Html5Qrcode:', error);
        }
    }

    // FIXED: Check permissions before starting camera
    async checkCameraPermission() {
        try {
            // Check if we already have permission
            if (this.permissionGranted) {
                return true;
            }

            // For modern browsers, check permission status
            if (navigator.permissions && navigator.permissions.query) {
                const permission = await navigator.permissions.query({ name: 'camera' });
                if (permission.state === 'granted') {
                    this.permissionGranted = true;
                    return true;
                } else if (permission.state === 'denied') {
                    throw new Error('تم رفض إذن الوصول للكاميرا. يرجى تمكينه من إعدادات المتصفح.');
                }
            }

            // For iOS Safari and other browsers, try to get cameras list (this will prompt for permission if needed)
            try {
                this.availableCameras = await Html5Qrcode.getCameras();
                if (this.availableCameras.length === 0) {
                    throw new Error('لا توجد كاميرات متاحة');
                }
                this.permissionGranted = true;
                return true;
            } catch (error) {
                if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
                    throw new Error('تم رفض إذن الوصول للكاميرا. يرجى السماح بالوصول للكاميرا وإعادة المحاولة.');
                }
                throw error;
            }
        } catch (error) {
            console.error('Camera permission check failed:', error);
            throw error;
        }
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
        this.productStock = document.getElementById('product-stock');
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
        
        // Close product card when clicking outside
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
        
        // Add to cart
        this.addToCartBtn?.addEventListener('click', () => this.addToCart());

        // Focus manual input initially
        setTimeout(() => {
            this.manualInput?.focus();
        }, 100);

        // FIXED: Handle page visibility changes to properly manage camera
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isScanning) {
                console.log('Page hidden, pausing scanner');
                this.pauseScanner();
            } else if (!document.hidden && this.isScanning) {
                console.log('Page visible, resuming scanner');
                this.resumeScanner();
            }
        });

        // FIXED: Handle page unload to properly clean up camera
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    // FIXED: Improved startScanner with proper permission handling
    async startScanner() {
        try {
            window.sharedUtils?.hideError();
            this.hideProductResult();
            
            this.showStatus('جاري فحص إذن الكاميرا...');
            
            // Check camera permission first
            await this.checkCameraPermission();
            
            this.showStatus('جاري تشغيل الكاميرا...');
            
            // Enter full-screen camera mode
            this.enterFullScreenMode();
            
            // Ensure we have an Html5Qrcode instance
            if (!this.html5QrCode) {
                this.initializeScanner();
            }

            // Use stored cameras if available, otherwise get them fresh
            if (this.availableCameras.length === 0) {
                this.availableCameras = await Html5Qrcode.getCameras();
            }

            if (this.availableCameras.length === 0) {
                throw new Error('لا توجد كاميرات متاحة');
            }

            // Use back camera by default, or first available
            const backCamera = this.availableCameras.find(camera => 
                camera.label.toLowerCase().includes('back') || 
                camera.label.toLowerCase().includes('rear') ||
                camera.label.toLowerCase().includes('environment')
            );
            
            const cameraId = backCamera?.id || this.availableCameras[3].id;
            this.currentCameraIndex = this.availableCameras.findIndex(cam => cam.id === cameraId);

            // FIXED: Optimized camera config for better iOS compatibility
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: false // Better iOS compatibility
                }
            };

            // FIXED: Start camera with the reused instance
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

    // FIXED: Improved stopScanner with proper cleanup
    async stopScanner() {
        try {
            if (this.html5QrCode && this.isScanning) {
                await this.html5QrCode.stop();
                // Don't clear the instance, just stop it so we can reuse it
                console.log('Camera stopped successfully');
            }
            
            this.isScanning = false;
            this.exitFullScreenMode();
            
        } catch (error) {
            console.error('Stop scanner error:', error);
            this.exitFullScreenMode();
        }
    }

    // NEW: Pause scanner without stopping (for page visibility)
    async pauseScanner() {
        if (this.html5QrCode && this.isScanning) {
            try {
                await this.html5QrCode.pause();
                console.log('Scanner paused');
            } catch (error) {
                console.error('Pause scanner error:', error);
            }
        }
    }

    // NEW: Resume scanner (for page visibility)
    async resumeScanner() {
        if (this.html5QrCode && this.isScanning) {
            try {
                await this.html5QrCode.resume();
                console.log('Scanner resumed');
            } catch (error) {
                console.error('Resume scanner error:', error);
                // If resume fails, try to restart
                this.stopScanner();
            }
        }
    }

    // FIXED: Improved switchCamera without permission re-request
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
                aspectRatio: 1.0,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: false
                }
            };

            // Start with new camera (no permission request since we're reusing the instance)
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

    // NEW: Proper cleanup method
    cleanup() {
        try {
            if (this.html5QrCode && this.isScanning) {
                this.html5QrCode.stop();
                this.html5QrCode.clear();
            }
        } catch (error) {
            console.error('Cleanup error:', error);
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
        if (!error.includes('No QR code found') && !error.includes('NotFoundException')) {
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
            
            if (!response) return;
            
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

        // Display product information
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
        console.log('Permission granted:', this.permissionGranted);
        console.log('Html5QrCode instance:', !!this.html5QrCode);
        
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

// Debug functions
window.testCartFunctionality = function() {
    console.log('=== CART FUNCTIONALITY TEST ===');
    
    if (!window.cartManager) {
        console.error('Cart manager not available');
        return;
    }
    
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
    
    if (window.cartManager.debugCart) {
        window.cartManager.debugCart();
    }
};

window.debugScannerPage = function() {
    if (window.scannerPage && window.scannerPage.debugAddToCart) {
        window.scannerPage.debugAddToCart();
    } else {
        console.error('Scanner page not available');
    }
};

console.log('Scanner page script loaded with iOS camera permission fix.');