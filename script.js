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
    const header = document.querySelector('header');

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
    const expandImgBtn = document.getElementById('expand-img-btn');

    // Lightbox elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
    const lightboxPrevBtn = document.getElementById('lightbox-prev-btn');
    const lightboxNextBtn = document.getElementById('lightbox-next-btn');

    // --- State ---
    let allProducts = [];
    let allAvailableImages = [];
    let selectedProducts = {};
    let lightboxImages = [];
    let currentLightboxIndex = 0;
    let currentModalGallery = [];

    // --- Function to dynamically set header height for scroll padding ---
    function updateHeaderHeight() {
        if (header) {
            const headerHeight = header.offsetHeight;
            document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
        }
    }

    // --- START: Thêm hàm cho hiệu ứng gõ chữ ---
    function startTypingEffect(element, speed = 150) {
        if (!element) return;
        const textToType = element.textContent.trim();
        let i = 0;
        element.innerHTML = '';
        function typeWriter() {
            if (i < textToType.length) {
                element.innerHTML += textToType.charAt(i);
                i++;
                setTimeout(typeWriter, speed);
            }
        }
        setTimeout(typeWriter, 500);
    }

    // --- START: Nâng cấp Hero Slideshow Function ---
    function startHeroSlideshow(imageUrls) {
        const slideshowImage = document.getElementById('hero-slideshow-image');
        if (!slideshowImage || imageUrls.length === 0) return;

        let currentImageIndex = 0;
        slideshowImage.src = imageUrls[currentImageIndex]; // Đặt ảnh đầu tiên

        setInterval(() => {
            currentImageIndex = (currentImageIndex + 1) % imageUrls.length;

            slideshowImage.style.opacity = 0; // Làm mờ ảnh cũ
            setTimeout(() => {
                slideshowImage.src = imageUrls[currentImageIndex]; // Đổi nguồn ảnh
                slideshowImage.style.opacity = 1; // Hiện ảnh mới
                // Reset animation để hiệu ứng Ken Burns bắt đầu lại
                slideshowImage.style.animation = 'none';
                slideshowImage.offsetHeight; /* Kích hoạt reflow */
                slideshowImage.style.animation = '';
            }, 1500); // Phải khớp với transition trong CSS

        }, 7000); // 7 giây mỗi ảnh
    }
    // --- END: Nâng cấp Hero Slideshow Function ---

    // --- Data Fetching ---
    async function fetchProducts() {
        try {
            loader.style.display = 'flex';
            if (productGrid) productGrid.classList.add('hidden');
            
            const response = await fetch(`${SCRIPT_URL}?action=getProducts`);
            if (!response.ok) throw new Error('Network response was not ok.');
            
            const data = await response.json();
            allProducts = data;

            allAvailableImages = allProducts
                .flatMap(p => [p.image_url, ...(p.gallery || [])])
                .filter(Boolean);
            allAvailableImages = [...new Set(allAvailableImages)];

            // --- CẬP NHẬT LOGIC TẠI ĐÂY ---
            // Lấy tất cả ảnh từ gallery của các sản phẩm để làm slideshow
            const slideshowImages = allProducts.flatMap(p => p.gallery || []).filter(Boolean);
            if (slideshowImages.length > 0) {
                // Đảm bảo không có ảnh trùng lặp và xáo trộn ngẫu nhiên
                const uniqueImages = [...new Set(slideshowImages)];
                for (let i = uniqueImages.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [uniqueImages[i], uniqueImages[j]] = [uniqueImages[j], uniqueImages[i]];
                }
                startHeroSlideshow(uniqueImages);
            }
            // --- KẾT THÚC CẬP NHẬT ---
            
            renderFeaturedProjects();
            renderCategories();
            const firstCategory = [...new Set(allProducts.map(p => p.category))][0];
            if (firstCategory) {
                 renderProducts(firstCategory);
            } else if (productGrid) {
                productGrid.innerHTML = `<p class="text-center text-gray-500 col-span-full">Chưa có sản phẩm nào để hiển thị.</p>`;
            }
            
        } catch (error) {
            console.error('Error fetching products:', error);
            if(productGrid) productGrid.innerHTML = `<p class="text-center text-red-500 col-span-full">Đã xảy ra lỗi khi tải sản phẩm. Vui lòng thử lại.</p>`;
        } finally {
            loader.style.display = 'none';
            if (productGrid) productGrid.classList.remove('hidden');
        }
    }

    // --- UI Rendering ---
    function renderFeaturedProjects() {
        const grid = document.getElementById('featured-projects-grid');
        if (!grid) return;

        const allGalleryImages = allProducts.flatMap(p => p.gallery || []).filter(Boolean);
        if (allGalleryImages.length === 0) {
            grid.innerHTML = '<p class="text-center text-gray-500 col-span-full">Chưa có dự án nào để hiển thị.</p>';
            return;
        }

        const uniqueImages = [...new Set(allGalleryImages)];
        for (let i = uniqueImages.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [uniqueImages[i], uniqueImages[j]] = [uniqueImages[j], uniqueImages[i]];
        }

        const imagesToShow = uniqueImages.slice(0, 6);

        grid.innerHTML = imagesToShow.map((imgUrl, index) => `
            <div class="project-item group overflow-hidden rounded-lg shadow-lg reveal-on-scroll relative" style="transition-delay: ${index * 100}ms;">
                <img src="${imgUrl}" alt="Dự án nổi bật ${index + 1}" class="w-full h-64 object-cover transform transition-transform duration-500 group-hover:scale-110" onerror="this.parentElement.style.display='none'">
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
                    <svg class="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>
        `).join('');

        const projectImageUrls = imagesToShow;
        grid.querySelectorAll('.project-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                openLightbox(index, projectImageUrls);
            });
        });
    }

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
    
    // --- START: BỔ SUNG HÀM XỬ LÝ CLICK DANH MỤC ---
    function handleCategoryClick(category) {
        // 1. Cập nhật trạng thái active cho button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            }
        });

        // 2. Render lại sản phẩm theo danh mục đã chọn
        renderProducts(category);
    }
    // --- END: BỔ SUNG HÀM XỬ LÝ CLICK DANH MỤC ---
    
    function createImageErrorHandler(product) {
        let attempts = 0;
        const fallbacks = [
            product.gallery && product.gallery[0],
            () => (allAvailableImages.length > 0 
                ? allAvailableImages[Math.floor(Math.random() * allAvailableImages.length)] 
                : null),
            'logo.png'
        ].filter(Boolean);

        return function handleError(event) {
            const imgElement = event.target;
            if (attempts < fallbacks.length) {
                let nextSrc = fallbacks[attempts];
                if (typeof nextSrc === 'function') nextSrc = nextSrc();
                if(nextSrc) imgElement.src = nextSrc;
                attempts++;
            } else {
                imgElement.removeEventListener('error', handleError);
                const card = imgElement.closest('.product-card');
                if (card) {
                    card.style.display = 'none';
                }
            }
        };
    }

    function renderProducts(category) {
        if (!productGrid) return;
        const filteredProducts = allProducts.filter(p => p.category === category);
        
        if (filteredProducts.length === 0) {
            productGrid.innerHTML = `<p class="w-full text-center text-gray-500 col-span-full">Không có sản phẩm nào trong danh mục này.</p>`;
            return;
        }

        productGrid.innerHTML = filteredProducts.map((product, index) => {
            const imageId = `product-image-${category.replace(/\s/g, '-')}-${index}`;
            return `
            <div class="product-card bg-white rounded-lg shadow-lg overflow-hidden flex flex-col reveal-on-scroll" style="transition-delay: ${index * 75}ms;">
                <div class="product-image-container h-48 overflow-hidden">
                    <img id="${imageId}" src="${product.image_url || ''}" alt="${product.name}" class="product-image w-full h-full object-cover" data-id="${product.id}">
                </div>
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
        `}).join('');
        
        filteredProducts.forEach((product, index) => {
            const imageId = `product-image-${category.replace(/\s/g, '-')}-${index}`;
            const imgElement = document.getElementById(imageId);
            if (imgElement) {
                imgElement.addEventListener('error', createImageErrorHandler(product));
                if (!imgElement.getAttribute('src')) imgElement.dispatchEvent(new Event('error'));
            }
        });
        
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleAddToCart(btn.dataset.id, e);
            });
        });

        initializeScrollReveal();
    }
    
    function renderSelectedItems() {
        if (!selectedItemsDiv || !totalPriceEl) return;
        if (Object.keys(selectedProducts).length === 0) {
            selectedItemsDiv.innerHTML = '<div class="text-center p-4"><svg class="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg><p class="mt-2 text-sm text-gray-500">Giỏ hàng của bạn đang trống.</p></div>';
            totalPriceEl.textContent = '0 VNĐ';
            return;
        }

        let total = 0;
        selectedItemsDiv.innerHTML = Object.values(selectedProducts).map(item => {
            total += item.price * item.quantity;
            // Nâng cấp: Thêm ảnh sản phẩm và thiết kế lại item
            return `
            <div class="selected-item flex items-center bg-white p-3 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md">
                <img src="${item.image_url || 'logo.png'}" alt="${item.name}" class="w-16 h-16 object-cover rounded-md mr-4" onerror="this.src='logo.png'">
                <div class="flex-grow">
                    <p class="font-bold text-gray-800">${item.name}</p>
                    <p class="text-sm text-red-500 font-semibold">${new Intl.NumberFormat('vi-VN').format(item.price)} VNĐ</p>
                </div>
                <div class="flex items-center space-x-3 bg-rose-50 rounded-full p-1">
                    <button class="quantity-change-btn text-red-500 font-bold rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-100 transition-colors" data-id="${item.id}" data-change="-1">-</button>
                    <span class="font-semibold w-5 text-center">${item.quantity}</span>
                    <button class="quantity-change-btn text-red-500 font-bold rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-100 transition-colors" data-id="${item.id}" data-change="1">+</button>
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

    function openModal(product) {
        if (!modal || !modalContent) return;
        currentModalGallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image_url];
        modalThumbnailGallery.innerHTML = '';
        modalMainImg.src = currentModalGallery[0];
        modalMainImg.onerror = () => { modalMainImg.src = 'https://placehold.co/600x400/fecdd3/ef4444?text=Ảnh+lỗi'; };
        currentModalGallery.forEach((imageUrl, index) => {
            const thumb = document.createElement('img');
            thumb.src = imageUrl;
            thumb.alt = `${product.name} thumbnail ${index + 1}`;
            thumb.classList.add('thumbnail-img');
            if (index === 0) thumb.classList.add('active');
            thumb.addEventListener('click', () => {
                modalMainImg.src = imageUrl;
                document.querySelectorAll('#modal-thumbnail-gallery .thumbnail-img').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
            modalThumbnailGallery.appendChild(thumb);
        });
        modalName.textContent = product.name;
        modalDesc.textContent = product.description;
        modalPrice.textContent = `${new Intl.NumberFormat('vi-VN').format(product.price)} VNĐ`;
        modalAddBtn.dataset.id = product.id;
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

    function showLightboxImage(index) {
        if (index < 0 || index >= lightboxImages.length) return;
        currentLightboxIndex = index;
        lightboxImg.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            lightboxImg.src = lightboxImages[currentLightboxIndex];
            lightboxImg.onload = () => {
                lightboxImg.classList.remove('opacity-0', 'scale-95');
            };
        }, 200);
        lightboxPrevBtn.classList.toggle('hidden', currentLightboxIndex === 0);
        lightboxNextBtn.classList.toggle('hidden', currentLightboxIndex === lightboxImages.length - 1);
    }

    function openLightbox(target, imageArray) {
        if (!lightbox || !lightboxImg || !imageArray || imageArray.length === 0) return;
        lightboxImages = imageArray;
        let startIndex = 0;
        if (typeof target === 'number') {
            startIndex = target;
        } else if (typeof target === 'string') {
            startIndex = lightboxImages.indexOf(target);
            if (startIndex === -1) {
                lightboxImages = [target];
                startIndex = 0;
            }
        }
        lightbox.classList.remove('hidden');
        lightbox.classList.add('flex');
        showLightboxImage(startIndex);
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.add('hidden');
        lightbox.classList.remove('flex');
    }

    function flyToCart(sourceElement) {
        const cartEl = document.getElementById('selected-items');
        if (!sourceElement || !cartEl) return;
        const imgRect = sourceElement.getBoundingClientRect();
        const flyingImage = document.createElement('img');
        flyingImage.src = sourceElement.src;
        flyingImage.classList.add('fly-to-cart-image');
        flyingImage.style.left = `${imgRect.left}px`;
        flyingImage.style.top = `${imgRect.top}px`;
        flyingImage.style.width = `${imgRect.width}px`;
        flyingImage.style.height = `${imgRect.height}px`;
        document.body.appendChild(flyingImage);
        requestAnimationFrame(() => {
            const cartRect = cartEl.getBoundingClientRect();
            flyingImage.style.left = `${cartRect.left + cartRect.width / 2}px`;
            flyingImage.style.top = `${cartRect.top + cartRect.height / 2}px`;
            flyingImage.style.width = '0px';
            flyingImage.style.height = '0px';
            flyingImage.style.opacity = '0.5';
            flyingImage.style.transform = 'scale(0.2) rotate(180deg)';
        });
        flyingImage.addEventListener('transitionend', () => flyingImage.remove(), { once: true });
    }

    function handleAddToCart(productId, event) {
        const product = allProducts.find(p => p.id == productId);
        if (!product) return;
        if (event && event.target) {
            const productCard = event.target.closest('.product-card');
            if (productCard) {
                const productImage = productCard.querySelector('.product-image');
                if (productImage) flyToCart(productImage);
            }
        }
        if (selectedProducts[productId]) {
            selectedProducts[productId].quantity++;
        } else {
            selectedProducts[productId] = { ...product, quantity: 1 };
        }
        setTimeout(() => renderSelectedItems(), 100);
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
        const customerData = {
            thoiGianGui: new Date().toLocaleString("vi-VN"),
            hoTen: formData.get('name'),
            soDienThoai: formData.get('phone'),
            ngayToChuc: formattedDate,
            diaChi: formData.get('address'),
            tenSanPham: productDetails.map(p => p.name).join('\n'),
            soLuong: productDetails.map(p => p.quantity).join('\n'),
            donGia: productDetails.map(p => new Intl.NumberFormat('vi-VN').format(p.price) + ' VNĐ').join('\n'),
            tongCong: productDetails.reduce((sum, item) => sum + item.price * item.quantity, 0)
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

    function initializeScrollReveal() {
        const revealElements = document.querySelectorAll('.reveal-on-scroll');
        if (revealElements.length === 0) return;
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        revealElements.forEach(el => {
            revealObserver.observe(el);
        });
    }

    // --- Initializations & Event Listeners ---
    updateHeaderHeight();
    startTypingEffect(document.getElementById('hero-title'), 150);
    fetchProducts();
    initializeScrollReveal();
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleFormSubmit);
    }
    if (productGrid) {
        productGrid.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart-btn')) return;
            const card = e.target.closest('.product-card');
            if (card) {
                const image = card.querySelector('.product-image');
                if (image) {
                     const productId = image.dataset.id;
                     const product = allProducts.find(p => p.id == productId);
                     if (product) openModal(product);
                }
            }
        });
    }
    if (modal && modalCloseBtn && modalAddBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        modalAddBtn.addEventListener('click', () => {
            const sourceImg = document.getElementById('modal-main-img');
            flyToCart(sourceImg);
            handleAddToCart(modalAddBtn.dataset.id, null);
            closeModal();
        });
    }
    if (expandImgBtn) {
        expandImgBtn.addEventListener('click', () => {
            if (modalMainImg && currentModalGallery.length > 0) {
                openLightbox(modalMainImg.src, currentModalGallery);
            }
        });
    }
    if (lightbox && lightboxCloseBtn) {
        lightboxCloseBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
        if (lightboxPrevBtn) {
            lightboxPrevBtn.addEventListener('click', () => {
                showLightboxImage(currentLightboxIndex - 1);
            });
        }
        if (lightboxNextBtn) {
            lightboxNextBtn.addEventListener('click', () => {
                showLightboxImage(currentLightboxIndex + 1);
            });
        }
    }
    const backToTopButton = document.getElementById('back-to-top');
    if (backToTopButton) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });
    }
    window.addEventListener('resize', () => {
        updateHeaderHeight();
    });
});

