import { db } from "./firebase-config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const productsGrid = document.getElementById("products-grid");
const filterButtons = document.querySelectorAll(".filter-btn");
const cartBtn = document.getElementById("cart-btn");
const cartDrawer = document.getElementById("cart-drawer");
const cartOverlay = document.getElementById("cart-overlay");
const closeCartBtn = document.getElementById("close-cart");
const cartItemsContainer = document.getElementById("cart-items-container");
const cartSubtotalEl = document.getElementById("cart-subtotal");
const whatsappCheckoutBtn = document.getElementById("whatsapp-checkout-btn");

// Variant Modal Elements
const variantModal = document.getElementById("variant-modal");
const closeVariantModalBtn = document.getElementById("close-variant-modal");
const confirmAddToCartBtn = document.getElementById("confirm-add-to-cart-btn");
const modalProductName = document.getElementById("modal-product-name");
const modalSizeSelect = document.getElementById("modal-size-select");
const modalColorSelect = document.getElementById("modal-color-select");

// Image Gallery Modal Elements
const imageModal = document.getElementById("image-modal");
const closeImageModalBtn = document.getElementById("close-image-modal");
const modalPreviewImg = document.getElementById("modal-preview-img");
const prevImgBtn = document.getElementById("prev-img-btn");
const nextImgBtn = document.getElementById("next-img-btn");
const imgCounterEl = document.getElementById("img-counter");

// Mobile Menu Elements
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const mobileNavLinks = document.querySelectorAll(".mobile-nav-link");

let cart = JSON.parse(localStorage.getItem("twinkle_cart")) || [];
let productsMap = {}; 
let activeProductForModal = null;

let currentModalImages = [];
let currentModalIndex = 0;

// ===============================
// MOBILE MENU TOGGLE
// ===============================
if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener("click", () => {
        mobileMenu.classList.toggle("hidden");
    });

    mobileNavLinks.forEach(link => {
        link.addEventListener("click", () => {
            mobileMenu.classList.add("hidden");
        });
    });
}

async function initStore() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        let allProductIds = [];
        querySnapshot.forEach((docSnap) => {
            allProductIds.push(docSnap.id);
        });

        cart = cart.filter(item => allProductIds.includes(item.id));
        localStorage.setItem("twinkle_cart", JSON.stringify(cart));
        updateCartCount();
    } catch (error) {
        console.error("Error validating cart:", error);
    }
    loadProducts("all");
}

async function loadProducts(category = "all") {
    productsGrid.className = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6";
    productsGrid.innerHTML = `<p class="col-span-full text-center text-gray-500 py-8">Loading products...</p>`;
    
    try {
        let q = collection(db, "products");
        if (category !== "all") {
            q = query(collection(db, "products"), where("category", "==", category));
        }
        const querySnapshot = await getDocs(q);
        productsGrid.innerHTML = "";
        productsMap = {}; 

        if (querySnapshot.empty) {
            productsGrid.innerHTML = `<p class="col-span-full text-center text-gray-500 py-8">No products found in this category yet.</p>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const product = docSnap.data();
            const productId = docSnap.id;
            const imagesList = product.images && product.images.length > 0 ? product.images : ['https://via.placeholder.com/300'];

            productsMap[productId] = {
                name: product.name,
                price: product.price,
                image: imagesList[0],
                images: imagesList,
                activeImageIndex: 0,
                sizes: product.sizes && product.sizes.length > 0 ? product.sizes : ["Standard"],
                colors: product.colors && product.colors.length > 0 ? product.colors : ["Standard"]
            };

            let thumbnailsHtml = '';
            if (imagesList.length > 1) {
                thumbnailsHtml = `<div class="flex space-x-1.5 mt-2 overflow-x-auto pb-1">`;
                imagesList.forEach((img, idx) => {
                    thumbnailsHtml += `<img src="${img}" onclick="window.switchCardImage('${productId}', '${img}', ${idx}, this)" class="w-7 h-7 md:w-9 md:h-9 object-cover rounded-lg border-2 ${idx === 0 ? 'border-pink-600' : 'border-transparent'} cursor-pointer hover:opacity-80 transition flex-shrink-0">`;
                });
                thumbnailsHtml += `</div>`;
            }

            const productCard = document.createElement("div");
            productCard.className = "bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between p-2.5 sm:p-4";
            
            productCard.innerHTML = `
                <div>
                    <img id="img-el-${productId}" src="${imagesList[0]}" alt="${product.name}" onclick="window.openImageModal('${productId}')" class="w-full h-32 sm:h-40 md:h-52 object-cover rounded-xl mb-1 shadow-inner cursor-pointer hover:opacity-95 transition" title="Click to view all photos">
                    ${thumbnailsHtml}
                    <span class="text-[9px] md:text-xs font-bold text-pink-600 uppercase tracking-wide mt-1.5 block">${product.category}</span>
                    <h3 class="font-bold text-gray-800 text-xs sm:text-base mt-0.5 truncate">${product.name}</h3>
                    <p class="text-pink-600 font-extrabold text-xs sm:text-base mt-0.5">Rs. ${product.price}</p>
                </div>
                <div class="mt-3 pt-2 border-t border-gray-100">
                    ${product.isAvailable === false ? 
                        `<span class="block text-center bg-gray-100 text-gray-500 font-semibold py-1.5 rounded-xl text-[10px] md:text-sm">Out of Stock</span>` :
                        `<button onclick="window.openVariantModal('${productId}')" class="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white py-1.5 sm:py-2 rounded-xl font-bold hover:opacity-95 transition text-[11px] md:text-sm shadow-sm">Add to Cart</button>`
                    }
                </div>
            `;
            productsGrid.appendChild(productCard);
        });
    } catch (error) {
        console.error("Error loading products: ", error);
        productsGrid.innerHTML = `<p class="col-span-full text-center text-red-500 py-8">Failed to load products.</p>`;
    }
}

window.switchCardImage = function(productId, imageUrl, index, thumbEl) {
    const imgElement = document.getElementById(`img-el-${productId}`);
    if (imgElement) imgElement.src = imageUrl;

    if (productsMap[productId]) {
        productsMap[productId].image = imageUrl;
        productsMap[productId].activeImageIndex = index;
    }

    const parent = thumbEl.parentElement;
    if (parent) {
        parent.querySelectorAll('img').forEach(img => {
            img.classList.remove('border-pink-600');
            img.classList.add('border-transparent');
        });
        thumbEl.classList.remove('border-transparent');
        thumbEl.classList.add('border-pink-600');
    }
}

window.openImageModal = function(productId) {
    const product = productsMap[productId];
    if (!product || !product.images) return;

    currentModalImages = product.images;
    currentModalIndex = product.activeImageIndex || 0;

    updateModalImageDisplay();

    imageModal.classList.remove("hidden");
    imageModal.classList.add("flex");
}

function updateModalImageDisplay() {
    modalPreviewImg.src = currentModalImages[currentModalIndex];
    imgCounterEl.textContent = `${currentModalIndex + 1} / ${currentModalImages.length}`;

    if (currentModalImages.length <= 1) {
        prevImgBtn.style.display = "none";
        nextImgBtn.style.display = "none";
    } else {
        prevImgBtn.style.display = "flex";
        nextImgBtn.style.display = "flex";
    }
}

prevImgBtn.addEventListener("click", () => {
    currentModalIndex = (currentModalIndex - 1 + currentModalImages.length) % currentModalImages.length;
    updateModalImageDisplay();
});

nextImgBtn.addEventListener("click", () => {
    currentModalIndex = (currentModalIndex + 1) % currentModalImages.length;
    updateModalImageDisplay();
});

if (closeImageModalBtn) {
    closeImageModalBtn.addEventListener("click", () => {
        imageModal.classList.remove("flex");
        imageModal.classList.add("hidden");
    });
}

imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
        imageModal.classList.remove("flex");
        imageModal.classList.add("hidden");
    }
});

filterButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
        filterButtons.forEach(b => {
            b.classList.remove("bg-pink-600", "text-white", "shadow-md");
            b.classList.add("bg-white", "text-gray-600", "border");
        });
        e.target.classList.remove("bg-white", "text-gray-600", "border");
        e.target.classList.add("bg-pink-600", "text-white", "shadow-md");
        
        const category = e.target.getAttribute("data-category");
        loadProducts(category);
    });
});

function parseAndExpandSizes(rawSizes) {
    let expanded = [];
    if (!rawSizes || rawSizes.length === 0) return ["Standard"];

    rawSizes.forEach(item => {
        item = item.trim();
        const rangeMatch = item.match(/^(\d+)\s*(-|to)\s*(\d+)(.*)$/i);
        if (rangeMatch) {
            let start = parseInt(rangeMatch[1]);
            let end = parseInt(rangeMatch[3]);
            let suffix = rangeMatch[4] ? rangeMatch[4].trim() : "";
            
            if (!suffix && item.toLowerCase().includes("year")) {
                suffix = "years";
            }

            for (let i = start; i <= end; i++) {
                expanded.push(`${i}${suffix ? ' ' + suffix : ''}`);
            }
        } else {
            expanded.push(item);
        }
    });
    return expanded;
}

window.openVariantModal = function(id) {
    const product = productsMap[id];
    if (!product) return;

    activeProductForModal = { id, name: product.name, price: product.price, image: product.image };
    modalProductName.textContent = product.name;
    
    const expandedSizes = parseAndExpandSizes(product.sizes);

    modalSizeSelect.innerHTML = expandedSizes.map(s => `<option value="${s}">${s}</option>`).join("");
    modalColorSelect.innerHTML = product.colors.map(c => `<option value="${c}">${c}</option>`).join("");
    
    variantModal.classList.remove("hidden");
    variantModal.classList.add("flex");
}

if (closeVariantModalBtn) {
    closeVariantModalBtn.addEventListener("click", () => {
        variantModal.classList.remove("flex");
        variantModal.classList.add("hidden");
    });
}

confirmAddToCartBtn.addEventListener("click", () => {
    if (!activeProductForModal) return;

    const selectedSize = modalSizeSelect.value;
    const selectedColor = modalColorSelect.value;
    const { id, name, price, image } = activeProductForModal;

    const cartItemId = `${id}-${selectedSize}-${selectedColor}`;
    const existingIndex = cart.findIndex(item => item.cartItemId === cartItemId);

    if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
    } else {
        cart.push({ cartItemId, id, name, price, image, size: selectedSize, color: selectedColor, qty: 1 });
    }

    localStorage.setItem("twinkle_cart", JSON.stringify(cart));
    updateCartCount();

    variantModal.classList.remove("flex");
    variantModal.classList.add("hidden");
});

function updateCartCount() {
    const countEl = document.getElementById("cart-count");
    if (countEl) {
        const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
        countEl.textContent = totalQty;
    }
}

cartBtn.addEventListener("click", () => {
    renderCartItems();
    cartDrawer.classList.remove("hidden");
    cartDrawer.classList.add("flex");
});

if (cartOverlay) {
    cartOverlay.addEventListener("click", () => {
        cartDrawer.classList.remove("flex");
        cartDrawer.classList.add("hidden");
    });
}

closeCartBtn.addEventListener("click", () => {
    cartDrawer.classList.remove("flex");
    cartDrawer.classList.add("hidden");
});

function renderCartItems() {
    cartItemsContainer.innerHTML = "";
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<p class="text-center text-gray-400 py-8 text-sm font-medium">Your shopping bag is empty.</p>`;
        cartSubtotalEl.textContent = "Rs. 0";
        return;
    }

    let subtotal = 0;
    cart.forEach((item, index) => {
        subtotal += item.price * item.qty;
        const cartItemEl = document.createElement("div");
        cartItemEl.className = "flex items-center justify-between bg-gray-50/60 border border-gray-100 p-3 rounded-2xl shadow-sm hover:border-pink-200 transition";
        cartItemEl.innerHTML = `
            <div class="flex items-center space-x-3">
                <img src="${item.image}" class="w-14 h-14 object-cover rounded-xl border border-pink-100 shadow-sm">
                <div>
                    <h4 class="font-bold text-gray-900 text-xs">${item.name}</h4>
                    <p class="text-[10px] text-gray-500 font-medium mt-0.5">Size: ${item.size} | Color: ${item.color}</p>
                    <p class="text-pink-600 font-extrabold text-xs mt-0.5">Rs. ${item.price} x ${item.qty}</p>
                </div>
            </div>
            <div class="flex items-center space-x-1.5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                <button onclick="window.changeQty(${index}, 1)" class="w-6 h-6 rounded-lg bg-pink-50 text-pink-600 font-bold hover:bg-pink-100 flex items-center justify-center text-xs transition">+</button>
                <span class="text-xs font-black text-gray-800 px-1.5">${item.qty}</span>
                <button onclick="window.changeQty(${index}, -1)" class="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 flex items-center justify-center text-xs transition">-</button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItemEl);
    });

    cartSubtotalEl.textContent = `Rs. ${subtotal}`;
}

window.changeQty = function(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    localStorage.setItem("twinkle_cart", JSON.stringify(cart));
    updateCartCount();
    renderCartItems();
}

whatsappCheckoutBtn.addEventListener("click", () => {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const name = document.getElementById("cust-name").value.trim();
    const phone = document.getElementById("cust-phone").value.trim();
    const address = document.getElementById("cust-address").value.trim();
    const city = document.getElementById("cust-city").value.trim();

    if (!name || !phone || !address || !city) {
        alert("Please fill in all shipping details (Name, Phone, Address, City) before placing the order!");
        return;
    }

    let message = `Assalam o Alaikum!\nI want to place an order from Twinkle Threads 🌟\n\n*Customer Details:*\n- Name: ${name}\n- Phone: ${phone}\n- Address: ${address}\n- City: ${city}\n\n*Order Details:* \n`;
    let subtotal = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        message += `${index + 1}. *${item.name}*\n   Size: ${item.size} | Color: ${item.color}\n   Quantity: ${item.qty}\n   Price: Rs. ${itemTotal}\n\n`;
    });

    message += `----------------------\n*Total Subtotal: Rs. ${subtotal}*\n\nPlease confirm my order!`;

    const shopWhatsAppNumber = "923281017338"; 
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${shopWhatsAppNumber}?text=${encodedMessage}`;

    window.open(whatsappURL, "_blank");
});

initStore();