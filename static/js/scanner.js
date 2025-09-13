/**
 * Arabic Price Scanner - Fixed Mobile-Friendly Version
 * Camera controls moved to input section for better mobile UX
 */

class PriceScanner {
    constructor() {
        this.html5QrCode = null;
        this.isScanning = false;
        this.lastScanTime = 0;
        this.scanCooldown = 2000; // 2 seconds between scans
        this.appUrl = null;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    checkMobilePermissions() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
        
        if (isMobile && location.protocol !== 'https:') {
            this.showError('يتطلب الوصول للكاميرا استخدام HTTPS على الأجهزة المحمولة');
            return false;
        }
        return true;
    }

    initializeElements() {
        // Buttons
        this.startBtn = document.getElementById('start-camera');
        this.stopBtn = document.getElementById('stop-camera');
        this.searchBtn = document.getElementById('search-manual');
        
        // Input
        this.manualInput = document.getElementById('manual-barcode');
        
        // Display elements
        this.scannerContainer = document.getElementById('camera-container');
        this.scannerStatus = document.getElementById('scanner-status');
        this.resultsSection = document.getElementById('product-result');
        this.loading = document.getElementById('loading-state');
        this.errorMessage = document.getElementById('error-message');
        this.errorText = document.getElementById('error-text');
        
        // Product display elements
        this.productName = document.getElementById('product-name');
        this.productPrice = document.getElementById('product-price');
        this.productDescription = document.getElementById('product-description');
        this.productBarcode = document.getElementById('product-barcode');
        this.closeResultBtn = document.getElementById('close-result');
        this.closeErrorBtn = document.getElementById('close-error');
        
        // App URL elements (simplified - no share button)
        this.getUrlBtn = document.getElementById('get-app-url');
        this.copyUrlBtn = document.getElementById('copy-app-url');
        this.urlDisplay = document.getElementById('url-display');
    }

    setupEventListeners() {
        // Scanner controls
        this.startBtn.addEventListener('click', () => this.startScanner());
        this.stopBtn.addEventListener('click', () => this.stopScanner());
        
        // Manual search
        this.searchBtn.addEventListener('click', () => this.searchManualBarcode());
        this.manualInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchManualBarcode();
            }
        });

        // Close buttons
        this.closeResultBtn.addEventListener('click', () => this.hideResults());
        this.closeErrorBtn.addEventListener('click', () => this.hideError());
        
        // App URL functionality (simplified)
        this.getUrlBtn.addEventListener('click', () => this.getAppUrl());
        this.copyUrlBtn.addEventListener('click', () => this.copyAppUrl());

        // Auto-focus manual input when page loads
        this.manualInput.focus();
    }

    async startScanner() {
        try {
            // Hide any existing results when starting camera
            this.hideResults();
            this.hideError();
            
            this.showStatus('جاري تشغيل الكاميرا...');
            
            // Show scanner container
            this.scannerContainer.classList.remove('hidden');
            
            // Initialize scanner
            this.html5QrCode = new Html5Qrcode("qr-reader");
            
            // Get cameras
            const cameras = await Html5Qrcode.getCameras();
            if (cameras.length === 0) {
                throw new Error('لا توجد كاميرات متاحة');
            }

            // Use back camera if available, otherwise use first camera
            const cameraId = cameras.find(camera => 
                camera.label.toLowerCase().includes('back') || 
                camera.label.toLowerCase().includes('rear')
            )?.id || cameras[0].id;

            // Scanner configuration - Simple working config
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            // Start scanning
            await this.html5QrCode.start(
                cameraId,
                config,
                (decodedText) => this.onScanSuccess(decodedText),
                (error) => this.onScanError(error)
            );

            this.isScanning = true;
            this.updateScannerControls();
            this.showStatus('وجه الكاميرا نحو الباركود');

        } catch (error) {
            console.error('Scanner error:', error);
            this.showError(`خطأ في الكاميرا: ${error.message}`);
            this.scannerContainer.classList.add('hidden');
        }
    }

    async stopScanner() {
        try {
            if (this.html5QrCode && this.isScanning) {
                await this.html5QrCode.stop();
                this.html5QrCode.clear();
            }
            
            this.isScanning = false;
            this.scannerContainer.classList.add('hidden');
            this.updateScannerControls();
            
        } catch (error) {
            console.error('Stop scanner error:', error);
        }
    }

    async onScanSuccess(decodedText) {
        // Prevent rapid repeated scans
        const now = Date.now();
        if (now - this.lastScanTime < this.scanCooldown) {
            return;
        }
        this.lastScanTime = now;

        console.log('Scanned barcode:', decodedText);
        this.showStatus(`تم المسح: ${decodedText}`);
        
        // Auto-hide scanner after successful scan
        await this.stopScanner();
        
        // Search for product
        this.searchProduct(decodedText);
    }

    onScanError(error) {
        // Ignore common scanning errors (they're normal)
        if (!error.includes('No QR code found')) {
            console.log('Scan error:', error);
        }
    }

    async searchManualBarcode() {
        const barcode = this.manualInput.value.trim();
        
        if (!barcode) {
            this.showError('يرجى إدخال رقم الباركود');
            this.manualInput.focus();
            return;
        }

        console.log('Manual search for:', barcode);
        await this.searchProduct(barcode);
    }

    async searchProduct(barcode) {
        try {
            // Show loading
            this.showLoading();
            this.hideError();
            this.hideResults();

            // Make API request
            const response = await fetch(`/api/price/${encodeURIComponent(barcode)}`);
            
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
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    displayProduct(product) {
        // Update product info
        this.productName.textContent = this.escapeHtml(product.product_name);
        this.productPrice.textContent = `${product.price.toFixed(2)} ${product.currency}`;
        this.productDescription.textContent = this.escapeHtml(product.description || 'لا يوجد وصف متاح');
        this.productBarcode.textContent = `الباركود: ${this.escapeHtml(product.barcode)}`;

        // Show results
        this.resultsSection.classList.remove('hidden');

        // Clear manual input
        this.manualInput.value = '';
        
        console.log('Product displayed:', product);
    }

    updateScannerControls() {
        if (this.isScanning) {
            this.startBtn.classList.add('hidden');
            this.stopBtn.classList.remove('hidden');
        } else {
            this.startBtn.classList.remove('hidden');
            this.stopBtn.classList.add('hidden');
        }
    }

    showStatus(message) {
        this.scannerStatus.textContent = this.escapeHtml(message);
    }

    showLoading() {
        this.loading.classList.remove('hidden');
    }

    hideLoading() {
        this.loading.classList.add('hidden');
    }

    showError(message) {
        this.errorText.textContent = this.escapeHtml(message);
        this.errorMessage.classList.remove('hidden');
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        this.errorMessage.classList.add('hidden');
    }

    hideResults() {
        this.resultsSection.classList.add('hidden');
    }

    async getAppUrl() {
        try {
            this.getUrlBtn.disabled = true;
            this.getUrlBtn.innerHTML = '<span class="btn-icon">⏳</span>جاري التحميل...';
            
            // Call the app-url endpoint
            const response = await fetch('/api/app-url');
            
            if (!response.ok) {
                throw new Error(`خطأ في الخادم: ${response.status}`);
            }
            
            const data = await response.json();
            this.appUrl = data.url;
            
            // Display the URL
            this.displayAppUrl(this.appUrl);
            
        } catch (error) {
            console.error('Get app URL error:', error);
            this.showError('خطأ في الحصول على رابط التطبيق: ' + error.message);
        } finally {
            this.getUrlBtn.disabled = false;
            this.getUrlBtn.innerHTML = '<span class="btn-icon">🔗</span>احصل على الرابط';
        }
    }

    displayAppUrl(url) {
        this.urlDisplay.innerHTML = `<div class="url-text">${this.escapeHtml(url)}</div>`;
        this.urlDisplay.classList.add('has-url');
        
        // Show copy button only (share button removed)
        this.copyUrlBtn.classList.remove('hidden');
    }

    async copyAppUrl() {
        if (!this.appUrl) return;
        
        try {
            await navigator.clipboard.writeText(this.appUrl);
            
            // Visual feedback
            const originalText = this.copyUrlBtn.innerHTML;
            this.copyUrlBtn.innerHTML = '<span class="btn-icon">✅</span>تم النسخ!';
            this.copyUrlBtn.style.background = 'var(--success-color)';
            
            setTimeout(() => {
                this.copyUrlBtn.innerHTML = originalText;
                this.copyUrlBtn.style.background = '';
            }, 2000);
            
        } catch (error) {
            console.error('Copy failed:', error);
            this.showError('فشل في نسخ الرابط');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize scanner when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Price Scanner...');
    window.scanner = new PriceScanner();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.scanner && window.scanner.isScanning) {
        if (document.hidden) {
            console.log('Page hidden, pausing scanner');
        } else {
            console.log('Page visible, resuming scanner');
        }
    }
});