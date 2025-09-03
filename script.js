document.addEventListener('DOMContentLoaded', () => {
    // !!! QUAN TRỌNG: Dán URL Web App của Google Apps Script của bạn vào đây
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbF1KEAleG6wGRYOMy8e91FW88jFxOM3HMwT-xKeMJ2F2mou0Wfk508sD9GqiHcQO4Pw/exec'; // THAY THẾ URL NÀY

    // --- UI Elements ---
    const productGrid = document.getElementById('product-grid');
    const loader = document.getElementById('loader');
    const categoryFilters = document.getElementById('category-filters');
    const selectedItemsDiv = document.getElementById('selected-items');
    const totalPriceEl = document.getElementById('total-price');
    const bookingForm = document.getElementById('booking-form');
    const submitBtn = document.getElementById('submit-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Modal elements
    const modal = document.getElementById('product-modal');
    const modalContent = document.getElementById('modal-content');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalMainImg = document.getElementById('modal-main-img');
    const modalThumbnailGallery = document.getElementById('modal-thumbnail-gallery');
    const modalName = document.getElementById('modal-name');
    const modalDesc = document.getElementById('modal-desc');
    const modalPrice = document.getElementById('modal-price');
    const modalAddBtn = document.getElementById('modal-add-btn');

    // --- State ---
    let allProducts = [];
    let selectedProducts = {}; 

    // --- Data Fetching ---
    async function fetchProducts() {
        try {
            if(loader) loader.style.display = 'flex';
            if(productGrid) productGrid.classList.add('hidden');
            
            const response = await fetch(`${SCRIPT_URL}?action=getProducts`);
            if (!response.ok) throw new Error('Network response was not ok.');
            
            const data = await response.json();
            allProducts = data;
            
            renderCategories();
            if (allProducts.length > 0 && allProducts[0].category) {
                 renderProducts(allProducts[0].category);
            } else if (productGrid) {
                productGrid.innerHTML = `<p class="text-center text-gray-500 col-span-full">Chưa có sản phẩm nào để hiển thị.</p>`;
            }
            
        } catch (error) {
            console.error('Error fetching products:', error);
            if(productGrid) productGrid.innerHTML = `<p class="text-center text-red-500 col-span-full">Đã xảy ra lỗi khi tải sản phẩm. Vui lòng thử lại.</p>`;
        } finally {
            if(loader) loader.style.display = 'none';
            if(productGrid) productGrid.classList.remove('hidden');
        }
    }

    // --- UI Rendering ---
    function renderCategories() {
        if (!categoryFilters || allProducts.length === 0) return;
        const categories = [...new Set(allProducts.map(p => p.category))];
        if (categories.length > 0 && categories[0]) {
            categoryFilters.innerHTML = categories.map((cat, index) => `
                <button class="category-btn ${index === 0 ? 'active' : ''} border border-gray-300 rounded-full px-4 py-2 text-sm font-semibold hover:bg-red-500 hover:text-white transition-colors" data-category="${cat}">
                    ${cat}
                </button>
            `).join('');
            
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.addEventListener('click', () => handleCategoryClick(btn.dataset.category));
            });
        }
    }

    function renderProducts(category) {
        if (!productGrid) return;
        const filteredProducts = allProducts.filter(p => p.category === category);
        if (filteredProducts.length === 0) {
            productGrid.innerHTML = `<p class="text-center text-gray-500 col-span-full">Không có sản phẩm nào trong danh mục này.</p>`;
            return;
        }

        productGrid.innerHTML = filteredProducts.map(product => `
            <div class="product-card bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
                <img src="${product.image_url}" alt="${product.name}" class="w-full h-48 object-cover cursor-pointer product-image" data-id="${product.id}" onerror="this.onerror=null;this.src='https://placehold.co/600x400/fecdd3/ef4444?text=Ảnh+lỗi';">
                <div class="p-4 flex flex-col flex-grow">
                    <h3 class="text-xl font-bold text-gray-800">${product.name}</h3>
                    <p class="text-gray-600 mt-2 flex-grow">${product.description}</p>
                    <div class="mt-4 flex justify-between items-center">
                        <p class="text-lg font-extrabold text-red-500">${new Intl.NumberFormat('vi-VN').format(product.price)} VNĐ</p>
                        <button class="add-to-cart-btn bg-red-500 text-white rounded-full px-4 py-2 hover:bg-red-600 transition-colors text-sm" data-id="${product.id}">
                            Chọn
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Ngăn sự kiện click lan ra ảnh
                handleAddToCart(btn.dataset.id)
            });
        });
    }
    
    function renderSelectedItems() {
        if (!selectedItemsDiv || !totalPriceEl) return;
        if (Object.keys(selectedProducts).length === 0) {
            selectedItemsDiv.innerHTML = '<p class="text-gray-500">Chưa có sản phẩm nào được chọn.</p>';
            totalPriceEl.textContent = '0 VNĐ';
            return;
        }

        let total = 0;
        selectedItemsDiv.innerHTML = Object.values(selectedProducts).map(item => {
            total += item.price * item.quantity;
            return `
            <div class="selected-item flex justify-between items-center bg-white p-3 rounded-md shadow-sm">
                <div>
                    <p class="font-semibold">${item.name}</p>
                    <p class="text-sm text-gray-500">${new Intl.NumberFormat('vi-VN').format(item.price)} VNĐ</p>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="quantity-change-btn text-red-500 font-bold px-2" data-id="${item.id}" data-change="-1">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-change-btn text-red-500 font-bold px-2" data-id="${item.id}" data-change="1">+</button>
                </div>
            </div>
            `;
        }).join('');
        
        totalPriceEl.textContent = `${new Intl.NumberFormat('vi-VN').format(total)} VNĐ`;
        
        document.querySelectorAll('.quantity-change-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const change = parseInt(btn.dataset.change);
                handleChangeQuantity(btn.dataset.id, change);
            });
        });
    }
    
    function showToast(message, isError = false) {
        if (!toast || !toastMessage) return;
        toastMessage.textContent = message;
        toast.classList.remove('bg-green-500', 'bg-red-500');
        toast.classList.add(isError ? 'bg-red-500' : 'bg-green-500');
        toast.classList.remove('opacity-0', 'translate-x-full');
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-x-full');
        }, 3000);
    }

    // --- Modal Functions ---
    function openModal(product) {
        if (!modal || !modalContent || !product.gallery || product.gallery.length === 0) return;
    
        // Xóa các ảnh thumbnail cũ
        modalThumbnailGallery.innerHTML = '';
        
        // Đặt ảnh chính là ảnh đầu tiên trong bộ sưu tập
        modalMainImg.src = product.gallery[0];
        modalMainImg.onerror = () => { modalMainImg.src = 'https://placehold.co/600x400/fecdd3/ef4444?text=Ảnh+lỗi'; };
    
        // Tạo và hiển thị các ảnh thumbnail
        product.gallery.forEach((imageUrl, index) => {
            const thumb = document.createElement('img');
            thumb.src = imageUrl;
            thumb.alt = `${product.name} thumbnail ${index + 1}`;
            thumb.classList.add('thumbnail-img');
            if (index === 0) {
                thumb.classList.add('active');
            }
            
            // Thêm sự kiện click để đổi ảnh chính
            thumb.addEventListener('click', () => {
                modalMainImg.src = imageUrl;
                document.querySelectorAll('#modal-thumbnail-gallery .thumbnail-img').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
            
            modalThumbnailGallery.appendChild(thumb);
        });
    
        // Điền thông tin chi tiết sản phẩm
        modalName.textContent = product.name;
        modalDesc.textContent = product.description;
        modalPrice.textContent = `${new Intl.NumberFormat('vi-VN').format(product.price)} VNĐ`;
        modalAddBtn.dataset.id = product.id;
    
        // Hiển thị modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => modalContent.classList.remove('scale-95'), 10);
    }

    function closeModal() {
        if (!modal || !modalContent) return;
        modalContent.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }

    // --- Event Handlers ---
    function handleCategoryClick(category) {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        renderProducts(category);
    }
    
    function handleAddToCart(productId) {
        const product = allProducts.find(p => p.id == productId);
        if (!product) return;
        if (selectedProducts[productId]) {
            selectedProducts[productId].quantity++;
        } else {
            selectedProducts[productId] = { ...product, quantity: 1 };
        }
        renderSelectedItems();
        showToast(`Đã thêm "${product.name}"!`);
    }
    
    function handleChangeQuantity(productId, change) {
        if (!selectedProducts[productId]) return;
        selectedProducts[productId].quantity += change;
        if (selectedProducts[productId].quantity <= 0) {
            const productName = selectedProducts[productId].name;
            delete selectedProducts[productId];
            showToast(`Đã xoá "${productName}"!`);
        }
        renderSelectedItems();
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        if (Object.keys(selectedProducts).length === 0) {
            showToast('Bạn chưa chọn sản phẩm!', true);
            return;
        }
        if(!submitBtn) return;
        submitBtn.disabled = true;
        document.getElementById('submit-text')?.classList.add('hidden');
        document.getElementById('submit-spinner')?.classList.remove('hidden');

        const formData = new FormData(bookingForm);
        const rawDate = formData.get('event-date');
        const dateParts = rawDate.split('-');
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : '';
        const productDetails = Object.values(selectedProducts);
        const tenSanPham = productDetails.map(p => p.name).join('\n');
        const soLuong = productDetails.map(p => p.quantity).join('\n');
        const donGia = productDetails.map(p => new Intl.NumberFormat('vi-VN').format(p.price) + ' VNĐ').join('\n');
        const customerData = {
            thoiGianGui: new Date().toLocaleString("vi-VN"),
            hoTen: formData.get('name'), 
            soDienThoai: formData.get('phone'), 
            ngayToChuc: formattedDate,
            diaChi: formData.get('address'), 
            tenSanPham, 
            soLuong, 
            donGia,
            tongCong: Object.values(selectedProducts).reduce((sum, item) => sum + item.price * item.quantity, 0)
        };
        
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(customerData) });
            const result = await response.json();
            if (result.status === 'success') {
                showToast('Chúng tôi đã nhận được yêu cầu của bạn!');
                bookingForm.reset();
                selectedProducts = {};
                renderSelectedItems();
            } else { throw new Error(result.message || 'Unknown error'); }
        } catch (error) {
            console.error('Error submitting form:', error);
            showToast('Gửi yêu cầu thất bại. Vui lòng thử lại.', true);
        } finally {
            submitBtn.disabled = false;
            document.getElementById('submit-text')?.classList.remove('hidden');
            document.getElementById('submit-spinner')?.classList.add('hidden');
        }
    }
    
    // --- Initializations & Event Listeners ---
    fetchProducts();

    if (bookingForm) {
        bookingForm.addEventListener('submit', handleFormSubmit);
    }

    if (productGrid) {
        productGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('product-image')) {
                const productId = e.target.dataset.id;
                const product = allProducts.find(p => p.id == productId);
                if (product) openModal(product);
            }
        });
    }

    if (modal && modalCloseBtn && modalAddBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        modalAddBtn.addEventListener('click', () => {
            handleAddToCart(modalAddBtn.dataset.id);
            closeModal();
        });
    }
});

