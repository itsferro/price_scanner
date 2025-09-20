/**
 * Info Page JavaScript - System Information and App URL Sharing
 */

class InfoPage {
    constructor() {
        this.appUrl = null;
        this.initializeElements();
        this.setupEventListeners();
        this.checkSystemStatus();
        this.updateCartCount();
    }

    initializeElements() {
        // URL section elements
        this.getUrlBtn = document.getElementById('get-app-url');
        this.copyUrlBtn = document.getElementById('copy-app-url');
        this.shareQrBtn = document.getElementById('share-qr-code');
        this.urlDisplay = document.getElementById('url-display');
        
        // System status elements
        this.dbStatus = document.getElementById('db-status');
        this.cartItemsCount = document.getElementById('cart-items-count');
        
        // QR modal elements
        this.qrModal = document.getElementById('qr-modal');
        this.closeQrModalBtn = document.getElementById('close-qr-modal');
        this.qrCodeContainer = document.getElementById('qr-code-container');
    }

    setupEventListeners() {
        // URL actions
        this.getUrlBtn?.addEventListener('click', () => this.getAppUrl());
        this.copyUrlBtn?.addEventListener('click', () => this.copyAppUrl());
        this.shareQrBtn?.addEventListener('click', () => this.showQrCode());
        
        // QR modal
        this.closeQrModalBtn?.addEventListener('click', () => this.hideQrModal());
        this.qrModal?.addEventListener('click', (e) => {
            if (e.target === this.qrModal) {
                this.hideQrModal();
            }
        });
        
        // Listen for cart updates
        document.addEventListener('cartUpdated', (e) => {
            this.updateCartCount(e.detail.count);
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.qrModal?.classList.contains('hidden')) {
                this.hideQrModal();
            }
        });
    }

    async checkSystemStatus() {
        try {
            if (this.dbStatus) {
                this.dbStatus.innerHTML = `
                    <span class="status-indicator checking">🔄</span>
                    جاري الفحص...
                `;
            }
            
            const response = await fetch('/api/health');
            const data = await response.json();
            
            if (this.dbStatus) {
                if (data.status === 'healthy') {
                    this.dbStatus.innerHTML = `
                        <span class="status-indicator connected">✅</span>
                        متصلة
                    `;
                } else {
                    this.dbStatus.innerHTML = `
                        <span class="status-indicator disconnected">❌</span>
                        غير متصلة
                    `;
                }
            }
            
        } catch (error) {
            console.error('Health check failed:', error);
            if (this.dbStatus) {
                this.dbStatus.innerHTML = `
                    <span class="status-indicator error">⚠️</span>
                    خطأ في الفحص
                `;
            }
        }
    }

    updateCartCount(count = null) {
        if (count === null) {
            count = window.cartManager?.getCartCount() || 0;
        }
        
        if (this.cartItemsCount) {
            this.cartItemsCount.textContent = count.toString();
        }
    }

    async getAppUrl() {
        try {
            this.getUrlBtn.disabled = true;
            this.getUrlBtn.innerHTML = '<span class="btn-icon">⏳</span>جاري التحميل...';
            
            const response = await window.sharedUtils.apiCall('/api/app-url');
            
            if (!response) return; // Auth redirect handled by apiCall
            
            if (!response.ok) {
                throw new Error(`خطأ في الخادم: ${response.status}`);
            }
            
            const data = await response.json();
            this.appUrl = data.url;
            
            this.displayAppUrl(this.appUrl);
            
        } catch (error) {
            console.error('Get app URL error:', error);
            window.sharedUtils.showError('خطأ في الحصول على رابط التطبيق: ' + error.message);
        } finally {
            this.getUrlBtn.disabled = false;
            this.getUrlBtn.innerHTML = '<span class="btn-icon">🔗</span>احصل على الرابط';
        }
    }

    displayAppUrl(url) {
        if (this.urlDisplay) {
            this.urlDisplay.innerHTML = `<div class="url-text">${window.sharedUtils.escapeHtml(url)}</div>`;
            this.urlDisplay.classList.add('has-url');
        }
        
        // Show additional action buttons
        this.copyUrlBtn?.classList.remove('hidden');
        this.shareQrBtn?.classList.remove('hidden');
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
            window.sharedUtils.showError('فشل في نسخ الرابط');
        }
    }

    async showQrCode() {
        if (!this.appUrl) {
            window.sharedUtils.showError('يرجى الحصول على الرابط أولاً');
            return;
        }
        
        try {
            // Clear previous QR code
            if (this.qrCodeContainer) {
                this.qrCodeContainer.innerHTML = '<div class="qr-loading">جاري إنشاء رمز QR...</div>';
            }
            
            this.qrModal?.classList.remove('hidden');
            
            // Generate QR code using qrcode.js library
            if (typeof QRCode !== 'undefined' && this.qrCodeContainer) {
                // Clear loading message
                this.qrCodeContainer.innerHTML = '';
                
                const canvas = document.createElement('canvas');
                this.qrCodeContainer.appendChild(canvas);
                
                await QRCode.toCanvas(canvas, this.appUrl, {
                    width: 256,
                    height: 256,
                    margin: 2,
                    color: {
                        dark: '#334155',  // Dark color
                        light: '#ffffff' // Light color
                    }
                });
                
            } else {
                throw new Error('مكتبة إنشاء رمز QR غير متوفرة');
            }
            
        } catch (error) {
            console.error('QR code generation failed:', error);
            if (this.qrCodeContainer) {
                this.qrCodeContainer.innerHTML = `
                    <div class="qr-error">
                        <span class="error-icon">⚠️</span>
                        <span>فشل في إنشاء رمز QR</span>
                    </div>
                `;
            }
            window.sharedUtils.showError('فشل في إنشاء رمز QR');
        }
    }

    hideQrModal() {
        this.qrModal?.classList.add('hidden');
    }

    // Utility method to refresh system info
    async refreshSystemInfo() {
        this.checkSystemStatus();
        this.updateCartCount();
        window.sharedUtils.showSuccess('تم تحديث معلومات النظام');
    }
}

// Initialize info page when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Info Page...');
    
    // Initialize bottom navigation
    window.navigation = new BottomNavigation('info');
    
    // Initialize info page
    window.infoPage = new InfoPage();
});