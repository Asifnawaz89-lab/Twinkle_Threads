import { db, auth } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const toggleModeBtn = document.getElementById("toggle-mode-btn");
const portalTitle = document.getElementById("portal-title");
const portalSubtitle = document.getElementById("portal-subtitle");
const logoutBtn = document.getElementById("logout-btn");
const forgotPasswordBtn = document.getElementById("forgot-password-btn");
const addProductForm = document.getElementById("add-product-form");
const adminProductsList = document.getElementById("admin-products-list");
const selectAllCheckbox = document.getElementById("select-all");

const IMGBB_API_KEY = "7e9c0c1a54ddb131f4cee646b9e6e713";

// ===============================
// TOGGLE LOGIN / REGISTER VIEW
// ===============================

let isRegisterMode = false;
if (toggleModeBtn) {
    toggleModeBtn.addEventListener("click", () => {
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
            if (portalTitle) portalTitle.textContent = "Create Admin Account";
            if (portalSubtitle) portalSubtitle.textContent = "Register a new email for store access";
            if (loginForm) loginForm.classList.add("hidden");
            if (registerForm) registerForm.classList.remove("hidden");
            toggleModeBtn.innerHTML = `Already have an admin account? <span class="text-pink-600 underline">Sign In</span>`;
        } else {
            if (portalTitle) portalTitle.textContent = "Admin Portal";
            if (portalSubtitle) portalSubtitle.textContent = "Sign in to manage Twinkle Threads inventory";
            if (registerForm) registerForm.classList.add("hidden");
            if (loginForm) loginForm.classList.remove("hidden");
            toggleModeBtn.innerHTML = `Don't have an admin account? <span class="text-pink-600 underline">Create New Account</span>`;
        }
    });
}

// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (loginSection) loginSection.classList.add("hidden");
        if (dashboardSection) dashboardSection.classList.remove("hidden");
        loadAdminProducts();
    } else {
        if (loginSection) loginSection.classList.remove("hidden");
        if (dashboardSection) dashboardSection.classList.add("hidden");
    }
});

// ===============================
// LOGIN
// ===============================

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("admin-email").value;
        const password = document.getElementById("admin-password").value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert("Login failed: " + error.message);
        }
    });
}

// ===============================
// REGISTER NEW ADMIN ACCOUNT
// ===============================

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("reg-email").value;
        const password = document.getElementById("reg-password").value;

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            alert("Admin account created successfully!");
        } catch (error) {
            alert("Registration failed: " + error.message);
        }
    });
}

// ===============================
// FORGOT PASSWORD
// ===============================

if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", async () => {
        const emailInput = document.getElementById("admin-email");
        const email = emailInput ? emailInput.value.trim() : "";
        
        if (!email) {
            alert("Please enter your email address in the Login email field first.");
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            alert("Password reset email sent! Check your inbox.");
        } catch (error) {
            alert("Error sending reset email: " + error.message);
        }
    });
}

// ===============================
// LOGOUT
// ===============================

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await signOut(auth);
    });
}

// ===============================
// ADD PRODUCT (MULTI-IMAGE SUPPORT)
// ===============================

if (addProductForm) {
    addProductForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("p-name").value;
        const category = document.getElementById("p-category").value;
        const price = Number(document.getElementById("p-price").value);
        
        const sizes = document.getElementById("p-sizes").value.split(",").map(s => s.trim()).filter(Boolean);
        const colors = document.getElementById("p-colors").value.split(",").map(c => c.trim()).filter(Boolean);

        const imageInput = document.getElementById("p-image-file");

        if (!imageInput.files || imageInput.files.length === 0) {
            return;
        }

        const submitBtn = addProductForm.querySelector("button[type='submit']");
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.textContent = "Uploading Images...";
        submitBtn.disabled = true;

        try {
            const imageUrls = [];

            for (const imageFile of imageInput.files) {
                const formData = new FormData();
                formData.append("image", imageFile);

                const response = await fetch(
                    `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
                    {
                        method: "POST",
                        body: formData
                    }
                );

                const result = await response.json();

                if (result.success) {
                    imageUrls.push(result.data.url);
                }
            }

            if (imageUrls.length === 0) {
                throw new Error("Failed to upload images to ImgBB");
            }

            await addDoc(collection(db, "products"), {
                name,
                category,
                price,
                sizes,
                colors,
                images: imageUrls,
                isAvailable: true,
                createdAt: Date.now()
            });

            addProductForm.reset();
            loadAdminProducts();

        } catch (error) {
            console.error("Error adding product:", error);
        } finally {
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}

// ===============================
// LOAD PRODUCTS
// ===============================

async function loadAdminProducts() {
    if (!adminProductsList) return;

    adminProductsList.innerHTML = `
        <p class="col-span-full text-center text-gray-500 py-6">Loading inventory...</p>
    `;

    if (selectAllCheckbox) selectAllCheckbox.checked = false;

    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        adminProductsList.innerHTML = "";

        if (querySnapshot.empty) {
            adminProductsList.innerHTML = `
                <p class="col-span-full text-center text-gray-500 py-6">No products found in inventory.</p>
            `;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const product = docSnap.data();
            const id = docSnap.id;
            const isAvailable = product.isAvailable !== false;
            const imagesList = product.images && product.images.length > 0 ? product.images : ['https://via.placeholder.com/300'];

            const item = document.createElement("div");
            item.className = "bg-gray-50 border border-gray-200 p-3 md:p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:bg-white transition relative";

            item.innerHTML = `
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <input type="checkbox" class="product-checkbox w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500" data-id="${id}">
                        <span class="text-[9px] md:text-xs font-bold text-pink-600 uppercase tracking-wider">${product.category}</span>
                    </div>
                    <img src="${imagesList[0]}" class="w-full h-32 sm:h-40 object-cover rounded-xl border mb-3">
                    <h4 class="font-bold text-gray-900 text-xs sm:text-sm truncate">${product.name}</h4>
                    <p class="text-pink-600 font-extrabold text-xs sm:text-sm mt-0.5">Rs. ${product.price}</p>
                    <p class="text-[10px] text-gray-500 truncate mt-1">Sizes: ${(product.sizes || []).join(", ")}</p>
                    <p class="text-[10px] text-gray-500 truncate">Colors: ${(product.colors || []).join(", ")}</p>
                    <p class="text-[9px] text-pink-500 font-semibold mt-1">🖼️ ${imagesList.length} Image(s)</p>
                </div>

                <div class="mt-4 pt-3 border-t border-gray-100 space-y-2">
                    <button onclick="window.toggleStock('${id}', ${isAvailable})" class="w-full py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition ${isAvailable ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}">
                        ${isAvailable ? 'Mark Out of Stock' : 'Mark Available'}
                    </button>
                    <button onclick="window.deleteProduct('${id}')" class="w-full py-1.5 rounded-xl text-[10px] sm:text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition">
                        Delete
                    </button>
                </div>
            `;

            adminProductsList.appendChild(item);
        });

        const productCheckboxes = document.querySelectorAll(".product-checkbox");
        productCheckboxes.forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                const allChecked = document.querySelectorAll(".product-checkbox:checked").length === productCheckboxes.length;
                if (selectAllCheckbox) selectAllCheckbox.checked = allChecked;
            });
        });

    } catch (error) {
        console.error("Error loading products:", error);
        adminProductsList.innerHTML = `<p class="col-span-full text-center text-red-500 py-6">Failed to load products.</p>`;
    }
}

// ===============================
// SELECT ALL
// ===============================

if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", () => {
        const productCheckboxes = document.querySelectorAll(".product-checkbox");
        productCheckboxes.forEach((checkbox) => {
            checkbox.checked = selectAllCheckbox.checked;
        });
    });
}

// ===============================
// DELETE SELECTED PRODUCTS
// ===============================

window.deleteSelectedProducts = async function () {
    const selectedCheckboxes = document.querySelectorAll(".product-checkbox:checked");

    if (selectedCheckboxes.length === 0) {
        return;
    }

    const selectedIds = Array.from(selectedCheckboxes).map((checkbox) => checkbox.dataset.id);

    try {
        await Promise.all(
            selectedIds.map((id) => deleteDoc(doc(db, "products", id)))
        );
        loadAdminProducts();
    } catch (error) {
        console.error("Error deleting selected products:", error);
    }
};

// ===============================
// TOGGLE STOCK STATUS
// ===============================

window.toggleStock = async function (id, currentStatus) {
    try {
        const productRef = doc(db, "products", id);
        await updateDoc(productRef, { isAvailable: !currentStatus });
        loadAdminProducts();
    } catch (error) {
        console.error("Error updating stock status:", error);
    }
};

// ===============================
// DELETE SINGLE PRODUCT
// ===============================

window.deleteProduct = async function (id) {
    try {
        await deleteDoc(doc(db, "products", id));
        loadAdminProducts();
    } catch (error) {
        console.error("Error deleting product:", error);
    }
};