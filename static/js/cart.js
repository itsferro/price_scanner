/**
 * CART.JS - Cart Page with Compact Print & Latin Numbers
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
        this.clearCartBtn?.addEventListener('click', () => this.showClearCartModal());
        this.printInvoiceBtn?.addEventListener('click', () => this.printInvoice());
        
        this.confirmClearBtn?.addEventListener('click', () => this.confirmClearCart());
        this.cancelClearBtn?.addEventListener('click', () => this.hideClearCartModal());

        this.printOnHostBtn = document.getElementById('print-on-host-btn');
        this.printOnHostBtn?.addEventListener('click', () => this.printOnHost());
        
        this.clearCartModal?.addEventListener('click', (e) => {
            if (e.target === this.clearCartModal) {
                this.hideClearCartModal();
            }
        });
        
        document.addEventListener('cartUpdated', () => {
            this.loadCartData();
        });
        
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
        
        const stockDisplay = item.stock_qty !== undefined && item.stock_qty !== null ? 
            `<div class="item-stock">المخزون: ${item.stock_qty} قطعة</div>` : '';
        
        // Compact HTML without barcode section
        itemDiv.innerHTML = `
            <div class="item-info">
                <h3 class="item-name">${this.escapeHtml(item.product_name)}</h3>
                ${stockDisplay}
                
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
        
        this.setupItemEventListeners(itemDiv, item);
        return itemDiv;
    }

    setupItemEventListeners(itemElement, item) {
        const minusBtn = itemElement.querySelector('.minus-btn');
        const plusBtn = itemElement.querySelector('.plus-btn');
        const quantityInput = itemElement.querySelector('.quantity-input');
        const removeBtn = itemElement.querySelector('.remove-btn');
        
        minusBtn?.addEventListener('click', () => {
            const newQuantity = Math.max(1, item.quantity - 1);
            this.updateItemQuantity(item.barcode, newQuantity);
        });
        
        plusBtn?.addEventListener('click', () => {
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
            
            if (item.stock_qty && newQuantity > item.stock_qty) {
                window.sharedUtils?.showError(`الكمية المطلوبة تتجاوز المخزون المتاح (${item.stock_qty})`);
                newQuantity = item.stock_qty;
                e.target.value = newQuantity;
            }
            
            newQuantity = Math.max(1, Math.min(999, newQuantity));
            this.updateItemQuantity(item.barcode, newQuantity);
        });
        
        quantityInput?.addEventListener('blur', (e) => {
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
        // Get current date and time with Latin numbers
        const now = new Date();
        
        // Format date in Latin numbers with "م" (Gregorian)
        const day = now.getDate();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const dateStr = `${year}/${month}/${day} م`;
        
        // Format time in Latin numbers (24-hour format)
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        
        if (this.printDate) this.printDate.textContent = dateStr;
        if (this.printTime) this.printTime.textContent = timeStr;
        
        // Clear and populate print items
        if (this.printItems) {
            this.printItems.innerHTML = '';
            
            cart.forEach((item, index) => {
                const row = document.createElement('tr');
                const itemTotal = (item.price * item.quantity).toFixed(2);
                
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
                
                // Generate compact barcode
                setTimeout(() => this.generatePrintBarcode(printBarcodeId, item.barcode), 50);
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
            if (typeof JsBarcode === 'undefined') {
                console.warn('JsBarcode library not loaded');
                return;
            }

            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.warn(`Canvas ${canvasId} not found`);
                return;
            }

            // Optimized barcode settings - bigger for easy scanning
            JsBarcode(canvas, barcodeValue, {
                format: "CODE128",
                width: 2,           // INCREASED from 1 - thicker lines for better scanning
                height: 40,         // INCREASED from 20/25 - taller for easy scanning
                displayValue: false,
                margin: 5,          // INCREASED from 2/3 - better margin
                fontSize: 0,
                background: "#ffffff",
                lineColor: "#000000"
            });

            console.log(`Generated scannable barcode for: ${barcodeValue}`);
            
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

    // async printOnHost() {
    //     const cart = window.cartManager?.getCart() || [];
        
    //     if (cart.length === 0) {
    //         window.sharedUtils?.showError('السلة فارغة - لا يمكن طباعة فاتورة');
    //         return;
    //     }
        
    //     try {
    //         // Show loading
    //         if (this.printOnHostBtn) {
    //             this.printOnHostBtn.disabled = true;
    //             this.printOnHostBtn.innerHTML = '<span class="btn-icon">⏳</span>جاري الطباعة...';
    //         }
            
    //         // Send print request to server
    //         const response = await window.sharedUtils?.apiCall('/api/print-invoice', {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //             body: JSON.stringify({ cart: cart })
    //         });
            
    //         if (!response) return;
            
    //         if (!response.ok) {
    //             const errorData = await response.json();
    //             throw new Error(errorData.detail || 'فشل في الطباعة');
    //         }
            
    //         const result = await response.json();
    //         window.sharedUtils?.showSuccess(result.message || 'تم إرسال الفاتورة للطباعة');
            
    //     } catch (error) {
    //         console.error('Print on host error:', error);
    //         window.sharedUtils?.showError('خطأ في الطباعة: ' + error.message);
    //     } finally {
    //         // Reset button
    //         if (this.printOnHostBtn) {
    //             this.printOnHostBtn.disabled = false;
    //             this.printOnHostBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-print"></i></span>طباعة على الجهاز المضيف';
    //         }
    //     }
    // }

    // Add this new method to the CartPage class

    async printOnHost() {
        const cart = window.cartManager?.getCart() || [];
        
        if (cart.length === 0) {
            window.sharedUtils?.showError('السلة فارغة - لا يمكن طباعة فاتورة');
            return;
        }
        
        try {
            // Show loading
            if (this.printOnHostBtn) {
                this.printOnHostBtn.disabled = true;
                this.printOnHostBtn.innerHTML = '<span class="btn-icon">⏳</span>جاري التحضير...';
            }
            
            window.sharedUtils?.showSuccess('جاري إنشاء الفاتورة...');
            
            // Step 1: Prepare print data (generates barcodes)
            this.preparePrintData(cart);
            
            // Wait for barcodes to render
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 2: Generate PDF from print template
            const pdfBlob = await this.generatePDFFromTemplate();
            
            if (!pdfBlob) {
                throw new Error('فشل في إنشاء ملف PDF');
            }
            
            // Step 3: Upload PDF to server
            window.sharedUtils?.showSuccess('جاري إرسال الفاتورة للطباعة...');
            await this.uploadPDFBlob(pdfBlob);
            
            window.sharedUtils?.showSuccess('تم إرسال الفاتورة للطباعة بنجاح!');
            
        } catch (error) {
            console.error('Print on host error:', error);
            window.sharedUtils?.showError('خطأ: ' + error.message);
        } finally {
            // Reset button
            if (this.printOnHostBtn) {
                this.printOnHostBtn.disabled = false;
                this.printOnHostBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-print"></i></span>طباعة على الجهاز المضيف';
            }
        }
    }

    async generatePDFFromTemplate() {
        return new Promise((resolve, reject) => {
            try {
                const printTemplate = document.getElementById('print-template');
                
                if (!printTemplate) {
                    reject(new Error('Print template not found'));
                    return;
                }
                
                // CRITICAL: Convert all canvas barcodes to images first
                const canvases = printTemplate.querySelectorAll('.print-barcode');
                console.log('Found barcodes to convert:', canvases.length);
                
                canvases.forEach(canvas => {
                    if (canvas.tagName === 'CANVAS') {
                        try {
                            // Convert canvas to image
                            const img = document.createElement('img');
                            img.src = canvas.toDataURL('image/png');
                            img.style.width = canvas.style.width || canvas.width + 'px';
                            img.style.height = canvas.style.height || canvas.height + 'px';
                            img.className = canvas.className;
                            
                            // Replace canvas with image
                            canvas.parentNode.replaceChild(img, canvas);
                            console.log('Converted canvas to image');
                        } catch (e) {
                            console.error('Failed to convert canvas:', e);
                        }
                    }
                });
                
                // Create print window
                const printWindow = window.open('', '_blank', 'width=800,height=1000');
                
                if (!printWindow) {
                    reject(new Error('Failed to open print window'));
                    return;
                }
                
                // Get styles
                const styles = Array.from(document.styleSheets)
                    .map(sheet => {
                        try {
                            return Array.from(sheet.cssRules)
                                .map(rule => rule.cssText)
                                .join('\n');
                        } catch (e) {
                            return '';
                        }
                    })
                    .join('\n');
                
                // Build HTML
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                    <head>
                        <meta charset="UTF-8">
                        <title>Invoice</title>
                        <style>
                            ${styles}
                            body { margin: 0; padding: 20px; background: white; }
                            .print-template { display: block !important; }
                            .print-barcode { display: block !important; max-width: 100%; }
                        </style>
                    </head>
                    <body>
                        ${printTemplate.innerHTML}
                    </body>
                    </html>
                `);
                
                printWindow.document.close();
                
                // Wait for images to load
                setTimeout(async () => {
                    try {
                        const element = printWindow.document.body;
                        
                        const opt = {
                            margin: 10,
                            filename: `Invoice_${Date.now()}.pdf`,
                            image: { type: 'jpeg', quality: 0.95 },
                            html2canvas: { 
                                scale: 2,
                                useCORS: true,
                                allowTaint: true,
                                backgroundColor: '#ffffff',
                                logging: true
                            },
                            jsPDF: { 
                                unit: 'mm', 
                                format: 'a4', 
                                orientation: 'portrait' 
                            }
                        };
                        
                        const pdfBlob = await html2pdf()
                            .set(opt)
                            .from(element)
                            .toPdf()
                            .output('blob');
                        
                        printWindow.close();
                        
                        console.log('PDF generated with barcodes:', pdfBlob.size, 'bytes');
                        resolve(pdfBlob);
                        
                    } catch (error) {
                        printWindow.close();
                        reject(error);
                    }
                }, 2000); // Increased wait time for barcode images
                
            } catch (error) {
                reject(error);
            }
        });
    }

    async uploadPDFBlob(pdfBlob) {
        try {
            // Create form data with the PDF blob
            const formData = new FormData();
            const timestamp = new Date().getTime();
            formData.append('file', pdfBlob, `Invoice_${timestamp}.pdf`);
            
            // Upload to server
            const response = await window.sharedUtils?.apiCall('/api/upload-and-print', {
                method: 'POST',
                body: formData
            });
            
            if (!response) {
                throw new Error('لم يتم الحصول على استجابة من الخادم');
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `خطأ في الخادم: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Upload successful:', result);
            
            return result;
            
        } catch (error) {
            console.error('Upload error:', error);
            throw new Error('فشل في رفع الملف: ' + error.message);
        }
    }

    showUploadDialog() {
        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.uploadAndPrintPDF(file);
            }
            document.body.removeChild(fileInput);
        });
        
        document.body.appendChild(fileInput);
        
        // Show instruction
        window.sharedUtils?.showSuccess('الآن اختر ملف PDF الذي حفظته');
        
        // Trigger file picker
        setTimeout(() => fileInput.click(), 500);
    }

    async uploadAndPrintPDF(file) {
        try {
            window.sharedUtils?.showLoading();
            
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            
            // Upload to server
            const response = await window.sharedUtils?.apiCall('/api/upload-and-print', {
                method: 'POST',
                body: formData
            });
            
            if (!response) return;
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'فشل في رفع الملف');
            }
            
            const result = await response.json();
            window.sharedUtils?.showSuccess(result.message || 'تم رفع الفاتورة وإرسالها للطباعة');
            
        } catch (error) {
            console.error('Upload and print error:', error);
            window.sharedUtils?.showError('خطأ في رفع الملف: ' + error.message);
        } finally {
            window.sharedUtils?.hideLoading();
        }
    }
}

// Initialize cart page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cart page initializing...');
    
    try {
        await window.waitForCommonUtils();
        window.navigation = new BottomNavigation('cart');
        window.cartPage = new CartPage();
        console.log('Cart page initialized successfully');
    } catch (error) {
        console.error('Error initializing cart page:', error);
        window.sharedUtils?.showError('خطأ في تحميل صفحة السلة');
    }
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.cartPage) {
        window.cartPage.loadCartData();
    }
});