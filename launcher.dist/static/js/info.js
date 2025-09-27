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