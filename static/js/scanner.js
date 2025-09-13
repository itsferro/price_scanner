/**
 * Price Scanner JavaScript
 * Handles barcode scanning and API communication
 */

class PriceScanner {
    constructor() {
        this.html5QrCode = null;
        this.isScanning = false;
        this.lastScanTime = 0;
        this.scanCooldown = 2000; // 2 seconds between scans
        
        this.initializeElements();
        this.setupEventListeners();
    }

    checkMobilePermissions() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
        
        if (isMobile && location.protocol !== 'https:') {
            this.showError('Camera access requires HTTPS on mobile devices. Please use manual barcode input instead.');
            return false;
        }
        return true;
    }

    initializeElements() {
        // Buttons
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.searchBtn = document.getElementById('search-btn');
        
        // Input
        this.manualInput = document.getElementById('manual-barcode');
        
        // Display elements
        this.scannerStatus = document.getElementById('scanner-status');
        this.resultsSection = document.getElementById('results-section');
        this.productInfo = document.getElementById('product-info');
        this.loading = document.getElementById('loading');
        this.errorMessage = document.getElementById('error-message');
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

        // Auto-focus manual input when page loads
        this.manualInput.focus();
    }

    async startScanner() {
        try {
            this.showStatus('Initializing camera...');
            
            // Initialize scanner
            this.html5QrCode = new Html5Qrcode("qr-reader");
            
            // Get cameras
            const cameras = await Html5Qrcode.getCameras();
            if (cameras.length === 0) {
                throw new Error('No cameras found');
            }

            // Use back camera if available, otherwise use first camera
            const cameraId = cameras.find(camera => 
                camera.label.toLowerCase().includes('back') || 
                camera.label.toLowerCase().includes('rear')
            )?.id || cameras[0].id;

            // Scanner configuration
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
            this.showStatus('Scanner active - Point camera at barcode');

        } catch (error) {
            console.error('Scanner error:', error);
            this.showError(`Camera error: ${error.message}`);
            this.showStatus('Click "Start Scanner" to begin');
        }
    }

    async stopScanner() {
        try {
            if (this.html5QrCode && this.isScanning) {
                await this.html5QrCode.stop();
                this.html5QrCode.clear();
            }
            
            this.isScanning = false;
            this.updateScannerControls();
            this.showStatus('Scanner stopped');
            
        } catch (error) {
            console.error('Stop scanner error:', error);
        }
    }

    onScanSuccess(decodedText) {
        // Prevent rapid repeated scans
        const now = Date.now();
        if (now - this.lastScanTime < this.scanCooldown) {
            return;
        }
        this.lastScanTime = now;

        console.log('Scanned barcode:', decodedText);
        this.showStatus(`Scanned: ${decodedText}`);
        
        // Search for product
        this.searchProduct(decodedText);
    }

    onScanError(error) {
        // Ignore common scanning errors (they're normal)
        // Only log if it's not a typical "no QR code found" error
        if (!error.includes('No QR code found')) {
            console.log('Scan error:', error);
        }
    }

    async searchManualBarcode() {
        const barcode = this.manualInput.value.trim();
        
        if (!barcode) {
            this.showError('Please enter a barcode');
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
                    throw new Error('Product not found');
                } else {
                    throw new Error(`Server error: ${response.status}`);
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
        this.productInfo.innerHTML = `
            <h2>${this.escapeHtml(product.product_name)}</h2>
            <div class="price">${product.currency} ${product.price.toFixed(2)}</div>
            <div class="description">${this.escapeHtml(product.description || 'No description available')}</div>
            <div class="barcode">Barcode: ${this.escapeHtml(product.barcode)}</div>
        `;

        // Show results with animation
        this.resultsSection.style.display = 'block';
        this.productInfo.classList.add('animate');

        // Remove animation class after animation completes
        setTimeout(() => {
            this.productInfo.classList.remove('animate');
        }, 500);

        // Clear manual input
        this.manualInput.value = '';
        
        console.log('Product displayed:', product);
    }

    updateScannerControls() {
        if (this.isScanning) {
            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'inline-block';
        } else {
            this.startBtn.style.display = 'inline-block';
            this.stopBtn.style.display = 'none';
        }
    }

    showStatus(message) {
        this.scannerStatus.innerHTML = `<p>${this.escapeHtml(message)}</p>`;
    }

    showLoading() {
        this.loading.style.display = 'block';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    showError(message) {
        this.errorMessage.innerHTML = `<strong>Error:</strong> ${this.escapeHtml(message)}`;
        this.errorMessage.style.display = 'block';
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
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

// Handle page visibility changes (pause scanner when tab is hidden)
document.addEventListener('visibilitychange', () => {
    if (window.scanner && window.scanner.isScanning) {
        if (document.hidden) {
            console.log('Page hidden, pausing scanner');
        } else {
            console.log('Page visible, resuming scanner');
        }
    }
});