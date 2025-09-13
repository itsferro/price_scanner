/**
 * Arabic Price Scanner - Professional Corporate Theme with Authentication
 */

class PriceScanner {
    constructor() {
        this.html5QrCode = null;
        this.isScanning = false;
        this.lastScanTime = 0;
        this.scanCooldown = 2000; // 2 seconds between scans
        this.appUrl = null;
        this.isAuthenticated = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkAuthStatus();
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
        // Authentication elements
        this.loginContainer = document.getElementById('login-container');
        this.appInterface = document.getElementById('app-interface');
        this.loginForm = document.getElementById('login-form');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('login-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.togglePasswordBtn = document.getElementById('toggle-password');
        this.welcomeMessage = document.getElementById('welcome-message');
        
        // Scanner elements
        this.startBtn = document.getElementById('start-camera');
        this.stopBtn = document.getElementById('stop-camera');
        this.searchBtn = document.getElementById('search-manual');
        this.manualInput = document.getElementById('manual-barcode');
        
        // Display elements
        this.scannerContainer = document.getElementById('camera-container');
        this.scannerStatus = document.getElementById('scanner-status');
        this.resultsSection = document.getElementById('product-result');
        this.loading = document.getElementById('loading-state');
        this.errorMessage = document.getElementById('error-message');
        this.errorText = document.getElementById('error-text');
        this.successMessage = document.getElementById('success-message');
        this.successText = document.getElementById('success-text');
        
        // Product display elements
        this.productName = document.getElementById('product-name');
        this.productPrice = document.getElementById('product-price');
        this.productDescription = document.getElementById('product-description');
        this.productBarcode = document.getElementById('product-barcode');
        this.closeResultBtn = document.getElementById('close-result');
        this.closeErrorBtn = document.getElementById('close-error');
        this.closeSuccessBtn = document.getElementById('close-success');
        
        // App URL elements
        this.getUrlBtn = document.getElementById('get-app-url');
        this.copyUrlBtn = document.getElementById('copy-app-url');
        this.urlDisplay = document.getElementById('url-display');
    }

    setupEventListeners() {
        // Authentication event listeners
        this.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
        this.logoutBtn?.addEventListener('click', () => this.handleLogout());
        this.togglePasswordBtn?.addEventListener('click', () => this.togglePassword());
        
        // Scanner controls (only if elements exist)
        this.startBtn?.addEventListener('click', () => this.startScanner());
        this.stopBtn?.addEventListener('click', () => this.stopScanner());
        
        // Manual search (only if elements exist)
        this.searchBtn?.addEventListener('click', () => this.searchManualBarcode());
        this.manualInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchManualBarcode();
            }
        });

        // Close buttons (only if elements exist)
        this.closeResultBtn?.addEventListener('click', () => this.hideResults());
        this.closeErrorBtn?.addEventListener('click', () => this.hideError());
        this.closeSuccessBtn?.addEventListener('click', () => this.hideSuccess());
        
        // App URL functionality (only if elements exist)
        this.getUrlBtn?.addEventListener('click', () => this.getAppUrl());
        this.copyUrlBtn?.addEventListener('click', () => this.copyAppUrl());
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth-status');
            const data = await response.json();
            
            if (data.authenticated) {
                this.showAppInterface(data.username);
            } else {
                this.showLoginForm();
            }
        } catch (error) {
            console.error('Auth status check failed:', error);
            this.showLoginForm();
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value;
        
        if (!username || !password) {
            this.showError('يرجى إدخال اسم المستخدم وكلمة المرور');
            return;
        }

        try {
            // Show loading state
            this.loginBtn.disabled = true;
            this.loginBtn.innerHTML = '<span class="btn-icon">⏳</span>جاري تسجيل الدخول...';
            
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess(data.message);
                setTimeout(() => {
                    this.showAppInterface(data.username);
                }, 1000);
            } else {
                throw new Error(data.detail || 'فشل في تسجيل الدخول');
            }

        } catch (error) {
            console.error('Login error:', error);
            this.showError(error.message || 'خطأ في تسجيل الدخول');
        } finally {
            // Reset button
            this.loginBtn.disabled = false;
            this.loginBtn.innerHTML = '<span class="btn-icon">🔓</span>تسجيل الدخول';
        }
    }

    async handleLogout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST'
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess(data.message);
                setTimeout(() => {
                    this.showLoginForm();
                    // Reset form
                    if (this.loginForm) {
                        this.loginForm.reset();
                    }
                }, 1000);
            } else {
                throw new Error(data.detail || 'فشل في تسجيل الخروج');
            }

        } catch (error) {
            console.error('Logout error:', error);
            this.showError(error.message || 'خطأ في تسجيل الخروج');
        }
    }

    togglePassword() {
        const type = this.passwordInput.type === 'password' ? 'text' : 'password';
        this.passwordInput.type = type;
        this.togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
    }

    showLoginForm() {
        this.isAuthenticated = false;
        this.loginContainer?.classList.remove('hidden');
        this.appInterface?.classList.add('hidden');
        
        // Focus username input
        setTimeout(() => {
            this.usernameInput?.focus();
        }, 100);
    }

    showAppInterface(username = '') {
        this.isAuthenticated = true;
        this.loginContainer?.classList.add('hidden');
        this.appInterface?.classList.remove('hidden');
        
        // Update welcome message
        if (this.welcomeMessage && username) {
            this.welcomeMessage.textContent = `مرحباً، ${username}`;
        }
        
        // Focus manual input when showing app
        setTimeout(() => {
            this.manualInput?.focus();
        }, 100);
    }

    // Scanner functionality (same as before, but with auth checks)
    async startScanner() {
        if (!this.isAuthenticated) {
            this.showError('يرجى تسجيل الدخول أولاً');
            return;
        }

        try {
            this.hideResults();
            this.hideError();
            
            this.showStatus('جاري تشغيل الكاميرا...');
            this.scannerContainer?.classList.remove('hidden');
            
            this.html5QrCode = new Html5Qrcode("qr-reader");
            
            const cameras = await Html5Qrcode.getCameras();
            if (cameras.length === 0) {
                throw new Error('لا توجد كاميرات متاحة');
            }

            const cameraId = cameras.find(camera => 
                camera.label.toLowerCase().includes('back') || 
                camera.label.toLowerCase().includes('rear')
            )?.id || cameras[0].id;

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
            this.updateScannerControls();
            this.showStatus('وجه الكاميرا نحو الباركود');

        } catch (error) {
            console.error('Scanner error:', error);
            this.showError(`خطأ في الكاميرا: ${error.message}`);
            this.scannerContainer?.classList.add('hidden');
        }
    }

    async stopScanner() {
        try {
            if (this.html5QrCode && this.isScanning) {
                await this.html5QrCode.stop();
                this.html5QrCode.clear();
            }
            
            this.isScanning = false;
            this.scannerContainer?.classList.add('hidden');
            this.updateScannerControls();
            
        } catch (error) {
            console.error('Stop scanner error:', error);
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
        
        await this.stopScanner();
        this.searchProduct(decodedText);
    }

    onScanError(error) {
        if (!error.includes('No QR code found')) {
            console.log('Scan error:', error);
        }
    }

    async searchManualBarcode() {
        if (!this.isAuthenticated) {
            this.showError('يرجى تسجيل الدخول أولاً');
            return;
        }

        const barcode = this.manualInput?.value.trim();
        
        if (!barcode) {
            this.showError('يرجى إدخال رقم الباركود');
            this.manualInput?.focus();
            return;
        }

        console.log('Manual search for:', barcode);
        await this.searchProduct(barcode);
    }

    async searchProduct(barcode) {
        try {
            this.showLoading();
            this.hideError();
            this.hideResults();

            const response = await fetch(`/api/price/${encodeURIComponent(barcode)}`);
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.showLoginForm();
                    throw new Error('انتهت صلاحية جلسة تسجيل الدخول');
                } else if (response.status === 404) {
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
        if (!this.productName) return;

        this.productName.textContent = this.escapeHtml(product.product_name);
        this.productPrice.textContent = `${product.price.toFixed(2)} ${product.currency}`;
        this.productDescription.textContent = this.escapeHtml(product.description || 'لا يوجد وصف متاح');
        this.productBarcode.textContent = `الباركود: ${this.escapeHtml(product.barcode)}`;

        this.resultsSection?.classList.remove('hidden');

        if (this.manualInput) {
            this.manualInput.value = '';
        }
        
        console.log('Product displayed:', product);
    }

    updateScannerControls() {
        if (this.isScanning) {
            this.startBtn?.classList.add('hidden');
            this.stopBtn?.classList.remove('hidden');
        } else {
            this.startBtn?.classList.remove('hidden');
            this.stopBtn?.classList.add('hidden');
        }
    }

    showStatus(message) {
        if (this.scannerStatus) {
            this.scannerStatus.textContent = this.escapeHtml(message);
        }
    }

    showLoading() {
        this.loading?.classList.remove('hidden');
    }

    hideLoading() {
        this.loading?.classList.add('hidden');
    }

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

    hideResults() {
        this.resultsSection?.classList.add('hidden');
    }

    async getAppUrl() {
        if (!this.isAuthenticated) {
            this.showError('يرجى تسجيل الدخول أولاً');
            return;
        }

        try {
            this.getUrlBtn.disabled = true;
            this.getUrlBtn.innerHTML = '<span class="btn-icon">⏳</span>جاري التحميل...';
            
            const response = await fetch('/api/app-url');
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.showLoginForm();
                    throw new Error('انتهت صلاحية جلسة تسجيل الدخول');
                } else {
                    throw new Error(`خطأ في الخادم: ${response.status}`);
                }
            }
            
            const data = await response.json();
            this.appUrl = data.url;
            
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
        if (this.urlDisplay) {
            this.urlDisplay.innerHTML = `<div class="url-text">${this.escapeHtml(url)}</div>`;
            this.urlDisplay.classList.add('has-url');
        }
        
        this.copyUrlBtn?.classList.remove('hidden');
    }

    async copyAppUrl() {
        if (!this.appUrl) return;
        
        try {
            await navigator.clipboard.writeText(this.appUrl);
            
            const originalText = this.copyUrlBtn.innerHTML;
            this.copyUrlBtn.innerHTML = '<span class="btn-icon">✅</span>تم النسخ!';
            this.copyUrlBtn.style.background = '#065f46';
            
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
    console.log('Initializing Price Scanner with Authentication...');
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