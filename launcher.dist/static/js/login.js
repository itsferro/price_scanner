/**
 * Login Page JavaScript
 */

class LoginPage {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.loginForm = document.getElementById('login-form');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('login-btn');
        this.togglePasswordBtn = document.getElementById('toggle-password');
        
        // Notification elements
        this.errorMessage = document.getElementById('error-message');
        this.errorText = document.getElementById('error-text');
        this.successMessage = document.getElementById('success-message');
        this.successText = document.getElementById('success-text');
        this.closeErrorBtn = document.getElementById('close-error');
        this.closeSuccessBtn = document.getElementById('close-success');
    }

    setupEventListeners() {
        this.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
        this.togglePasswordBtn?.addEventListener('click', () => this.togglePassword());
        this.closeErrorBtn?.addEventListener('click', () => this.hideError());
        this.closeSuccessBtn?.addEventListener('click', () => this.hideSuccess());
        
        // Focus username input on page load
        setTimeout(() => {
            this.usernameInput?.focus();
        }, 100);
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
            this.loginBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-spinner fa-spin"></i></span>جاري تسجيل الدخول...';
            
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
                // Redirect after success message
                setTimeout(() => {
                    window.location.href = data.redirect_url || '/scanner';
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
            this.loginBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-unlock"></i></span>تسجيل الدخول';
        }
    }

    togglePassword() {
        const type = this.passwordInput.type === 'password' ? 'text' : 'password';
        this.passwordInput.type = type;
        
        // Update icon based on password visibility
        const icon = this.togglePasswordBtn.querySelector('i');
        if (type === 'password') {
            icon.className = 'fas fa-eye';
        } else {
            icon.className = 'fas fa-eye-slash';
        }
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize login page when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Login Page...');
    window.loginPage = new LoginPage();
});