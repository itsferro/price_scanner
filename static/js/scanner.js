/**
 * Scanner Page JavaScript - Mobile-First Full Screen Design
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
        // Removed keyboard handling temporarily to fix basic functionality
    }

    checkMobilePermissions() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
        
        if (isMobile && location.protocol !== 'https:') {
            window.sharedUtils.showError('يتطلب الوصول للكاميرا استخدام HTTPS على الأجهزة المحمولة');
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
        this.productDescription = document.getElementById('product-description');
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
        
        // Quantity controls
        this.quantityMinusBtn?.addEventListener('click', () => this.adjustQuantity(-1));
        this.quantityPlusBtn?.addEventListener('click', () => this.adjustQuantity(1));
        this.quantityInput?.addEventListener('change', () => this.validateQuantity());
        
        // Add to cart
        this.addToCartBtn?.addEventListener('click', () => this.addToCart());

        // Focus manual input initially
        setTimeout(() => {
            this.manualInput?.focus();
        }, 100);
    }

    // Removed keyboard handling for now - will add back once basic layout is stable

    async startScanner() {
        try {
            window.sharedUtils.hideError();
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
            
            const cameraId = backCamera?.id || this.availableCameras[0].id;
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
            window.sharedUtils.showError(`خطأ في الكاميرا: ${error.message}`);
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
            window.sharedUtils.showError('فشل في تبديل الكاميرا');
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
            window.sharedUtils.showError('يرجى إدخال رقم الباركود');
            this.manualInput?.focus();
            return;
        }

        console.log('Manual search for:', barcode);
        await this.searchProduct(barcode);
    }

    async searchProduct(barcode) {
        try {
            window.sharedUtils.showLoading();
            window.sharedUtils.hideError();
            this.hideProductResult();

            const response = await window.sharedUtils.apiCall(`/api/price/${encodeURIComponent(barcode)}`);
            
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
            window.sharedUtils.showError(error.message);
        } finally {
            window.sharedUtils.hideLoading();
        }
    }

    displayProduct(product) {
        this.currentProduct = product;
        
        if (!this.productName) return;

        this.productName.textContent = window.sharedUtils.escapeHtml(product.product_name);
        this.productPrice.textContent = `${product.price.toFixed(2)} ${product.currency}`;
        this.productDescription.textContent = window.sharedUtils.escapeHtml(product.description || 'لا يوجد وصف متاح');
        this.productBarcode.textContent = `الباركود: ${window.sharedUtils.escapeHtml(product.barcode)}`;

        // Reset quantity to 1
        if (this.quantityInput) {
            this.quantityInput.value = 1;
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
        const newValue = Math.max(1, Math.min(999, currentValue + delta));
        this.quantityInput.value = newValue;
    }

    validateQuantity() {
        if (!this.quantityInput) return;
        
        let value = parseInt(this.quantityInput.value) || 1;
        value = Math.max(1, Math.min(999, value));
        this.quantityInput.value = value;
    }

    addToCart() {
        if (!this.currentProduct) return;
        
        const quantity = parseInt(this.quantityInput?.value) || 1;
        
        const success = window.cartManager.addProduct(this.currentProduct, quantity);
        
        if (success) {
            window.sharedUtils.showSuccess(`تم إضافة ${quantity} ${this.currentProduct.product_name} إلى السلة`);
            this.hideProductResult();
            
            // Focus manual input for next scan
            setTimeout(() => {
                this.manualInput?.focus();
            }, 100);
        } else {
            window.sharedUtils.showError('فشل في إضافة المنتج إلى السلة');
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
            this.scannerStatus.textContent = window.sharedUtils.escapeHtml(message);
        }
    }
}

// Initialize scanner page when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Scanner Page...');
    
    // Initialize bottom navigation
    window.navigation = new BottomNavigation('scanner');
    
    // Initialize scanner page
    window.scannerPage = new ScannerPage();
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