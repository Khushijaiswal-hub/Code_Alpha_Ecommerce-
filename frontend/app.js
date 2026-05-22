const API = 'http://localhost:3000/api';

// ── STATE ─────────────────────────────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let token = localStorage.getItem('token') || null;
let allProducts = [];
let activeCategory = 'All';
let currentProductId = null;
let qty = 1;

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderAuth();
  updateCartBadge();
  loadCategories();
  loadProducts();
});

// ── PAGE NAVIGATION ───────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  window.scrollTo(0, 0);

  if (name === 'cart')    renderCart();
  if (name === 'orders')  loadOrders();
  if (name === 'checkout') renderCheckoutSummary();
}

function requireAuth(page) {
  if (!user) { showPage('auth'); toast('Please login first', 'error'); return; }
  showPage(page);
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function renderAuth() {
  const area = document.getElementById('authArea');
  if (user) {
    area.innerHTML = `
      <div class="user-pill">
        <span class="user-name">Hi, ${user.name.split(' ')[0]}!</span>
        <button class="logout-btn" onclick="logout()">Logout</button>
      </div>`;
  } else {
    area.innerHTML = `<button class="login-nav-btn" onclick="showPage('auth')">Login / Register</button>`;
  }
}

function switchTab(tab) {
  document.getElementById('loginForm').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tabLogin').classList.toggle('active',    tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
}

async function login() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;
  if (!email || !password) { toast('Fill in all fields', 'error'); return; }

  try {
    const res  = await fetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) { toast(data.error, 'error'); return; }

    token = data.token; user = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    renderAuth();
    showPage('home');
    toast(`Welcome back, ${user.name.split(' ')[0]}!`);
  } catch { toast('Connection error', 'error'); }
}

async function register() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value;
  if (!name || !email || !password) { toast('Fill in all fields', 'error'); return; }

  try {
    const res  = await fetch(`${API}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, email, password }) });
    const data = await res.json();
    if (!res.ok) { toast(data.error, 'error'); return; }

    token = data.token; user = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    renderAuth();
    showPage('home');
    toast(`Account created! Welcome, ${user.name.split(' ')[0]}!`);
  } catch { toast('Connection error', 'error'); }
}

function logout() {
  token = null; user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  renderAuth();
  showPage('home');
  toast('Logged out');
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
async function loadCategories() {
  try {
    const res  = await fetch(`${API}/products/categories`);
    const cats = await res.json();
    const tabs = document.getElementById('categoryTabs');
    tabs.innerHTML = cats.map(c =>
      `<button class="cat-tab ${c === 'All' ? 'active' : ''}" onclick="selectCategory('${c}')">${c}</button>`
    ).join('');
  } catch { console.error('Failed to load categories'); }
}

function selectCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.toggle('active', b.textContent === cat));
  filterProducts();
}

async function loadProducts() {
  try {
    const res  = await fetch(`${API}/products`);
    allProducts = await res.json();
    renderProducts(allProducts);
  } catch { document.getElementById('productGrid').innerHTML = '<p class="loading">Failed to load products. Is the server running?</p>'; }
}

function filterProducts() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  let filtered = allProducts;
  if (activeCategory !== 'All') filtered = filtered.filter(p => p.category === activeCategory);
  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
  renderProducts(filtered);
}

function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  if (products.length === 0) {
    grid.innerHTML = '<p class="loading">No products found.</p>';
    return;
  }
  grid.innerHTML = products.map((p, i) => `
    <div class="product-card" style="animation-delay:${i * 0.05}s">
      <img src="${p.image}" alt="${p.name}" onclick="showProduct(${p.id})" loading="lazy"/>
      <div class="card-body" onclick="showProduct(${p.id})">
        <p class="card-category">${p.category}</p>
        <p class="card-name">${p.name}</p>
        <p class="card-price">$${parseFloat(p.price).toFixed(2)}</p>
      </div>
      <div class="card-footer">
        <button class="btn-primary"   onclick="addToCart(${p.id});event.stopPropagation()">Add to Cart</button>
        <button class="btn-secondary" onclick="showProduct(${p.id});event.stopPropagation()">Details</button>
      </div>
    </div>
  `).join('');
}

// ── PRODUCT DETAIL ────────────────────────────────────────────────────────────
async function showProduct(id) {
  currentProductId = id;
  qty = 1;
  showPage('product');

  try {
    const res     = await fetch(`${API}/products/${id}`);
    const p       = await res.json();
    document.getElementById('productDetail').innerHTML = `
      <a class="back-link" onclick="showPage('home')">← Back to Store</a>
      <div class="detail-grid">
        <img src="${p.image}" alt="${p.name}"/>
        <div>
          <p class="detail-category">${p.category}</p>
          <h1 class="detail-name">${p.name}</h1>
          <p class="detail-price">$${parseFloat(p.price).toFixed(2)}</p>
          <p class="detail-desc">${p.description}</p>
          <p class="detail-stock">Stock: <span>${p.stock} available</span></p>
          <div class="qty-row">
            <button class="qty-btn" onclick="changeQty(-1)">−</button>
            <span class="qty-val" id="qtyDisplay">1</span>
            <button class="qty-btn" onclick="changeQty(1)">+</button>
            <span style="color:var(--muted);font-size:.9rem">quantity</span>
          </div>
          <button class="btn-primary" onclick="addToCart(${p.id}, true)" style="margin-right:.75rem">Add to Cart</button>
          <button class="btn-secondary" onclick="showPage('home')">Back</button>
        </div>
      </div>`;
  } catch { document.getElementById('productDetail').innerHTML = '<p class="loading">Failed to load product.</p>'; }
}

function changeQty(delta) {
  qty = Math.max(1, qty + delta);
  document.getElementById('qtyDisplay').textContent = qty;
}

// ── CART ──────────────────────────────────────────────────────────────────────
function addToCart(productId, useQty = false) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const quantity = useQty ? qty : 1;
  const existing = cart.find(i => i.productId === productId);
  if (existing) existing.quantity += quantity;
  else cart.push({ productId, name: product.name, price: parseFloat(product.price), image: product.image, quantity });

  saveCart();
  toast(`${product.name} added to cart! 🛒`);
}

function updateCartQty(productId, delta) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter(i => i.productId !== productId);
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.productId !== productId);
  saveCart();
  renderCart();
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const total = cart.reduce((sum, i) => sum + i.quantity, 0);
  document.getElementById('cartBadge').textContent = total;
}

function renderCart() {
  const itemsEl   = document.getElementById('cartItems');
  const summaryEl = document.getElementById('cartSummary');

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add some products to get started!</p>
        <br/>
        <button class="btn-primary" onclick="showPage('home')">Browse Products</button>
      </div>`;
    summaryEl.innerHTML = '';
    return;
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping  = subtotal > 100 ? 0 : 9.99;
  const total     = subtotal + shipping;

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}"/>
      <div class="cart-item-info">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">$${item.price.toFixed(2)} each</p>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="updateCartQty(${item.productId}, -1)">−</button>
        <span class="qty-val">${item.quantity}</span>
        <button class="qty-btn" onclick="updateCartQty(${item.productId}, 1)">+</button>
        <button class="remove-btn" onclick="removeFromCart(${item.productId})">✕ Remove</button>
      </div>
      <strong style="color:var(--accent);min-width:70px;text-align:right">$${(item.price * item.quantity).toFixed(2)}</strong>
    </div>
  `).join('');

  summaryEl.innerHTML = `
    <div class="cart-summary-box">
      <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span></div>
      ${shipping === 0 ? '<div class="summary-row"><span style="color:#6dd">🎉 Free shipping!</span></div>' : '<div class="summary-row"><span style="color:var(--muted);font-size:.82rem">Free shipping on orders over $100</span></div>'}
      <div class="summary-total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
      <button class="btn-primary full" onclick="goCheckout()">Proceed to Checkout →</button>
    </div>`;
}

function goCheckout() {
  if (!user) { showPage('auth'); toast('Please login to checkout', 'error'); return; }
  showPage('checkout');
}

// ── CHECKOUT ──────────────────────────────────────────────────────────────────
function renderCheckoutSummary() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping  = subtotal > 100 ? 0 : 9.99;
  const total     = subtotal + shipping;

  document.getElementById('checkoutSummary').innerHTML = `
    <h3>Order Summary</h3>
    ${cart.map(i => `<div class="cs-item"><span>${i.name} × ${i.quantity}</span><span>$${(i.price*i.quantity).toFixed(2)}</span></div>`).join('')}
    <div class="cs-item"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : '$'+shipping.toFixed(2)}</span></div>
    <div class="cs-total"><span>Total</span><span>$${total.toFixed(2)}</span></div>`;
}

async function placeOrder() {
  const name    = document.getElementById('chkName').value.trim();
  const street  = document.getElementById('chkStreet').value.trim();
  const city    = document.getElementById('chkCity').value.trim();
  const zip     = document.getElementById('chkZip').value.trim();
  const country = document.getElementById('chkCountry').value.trim();

  if (!name || !street || !city || !zip || !country) {
    toast('Please fill in all shipping fields', 'error'); return;
  }
  if (cart.length === 0) { toast('Your cart is empty', 'error'); return; }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping  = subtotal > 100 ? 0 : 9.99;

  try {
    const res  = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: { name, street, city, zip, country }
      })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error, 'error'); return; }

    cart = [];
    saveCart();
    showPage('success');
    toast('Order placed successfully! 🎉');
  } catch { toast('Order failed. Check server connection.', 'error'); }
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
async function loadOrders() {
  if (!user) return;
  const el = document.getElementById('ordersList');
  el.innerHTML = '<p class="loading">Loading orders…</p>';

  try {
    const res    = await fetch(`${API}/orders`, { headers: { 'Authorization': `Bearer ${token}` } });
    const orders = await res.json();

    if (orders.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>No orders yet</h3>
          <p>Your orders will appear here after checkout.</p>
          <br/>
          <button class="btn-primary" onclick="showPage('home')">Start Shopping</button>
        </div>`;
      return;
    }

    el.innerHTML = orders.map(o => `
      <div class="order-card">
        <div class="order-header">
          <span class="order-id">Order #${o.id}</span>
          <span class="order-badge">✓ ${o.status}</span>
        </div>
        <div class="order-thumbs">
          ${(o.items || []).map(i => `<img class="order-thumb" src="${i.product_image}" alt="${i.product_name}" title="${i.product_name} × ${i.quantity}"/>`).join('')}
        </div>
        <div class="order-footer">
          <span class="order-total">$${parseFloat(o.total).toFixed(2)}</span>
          <span class="order-date">${new Date(o.created_at).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}</span>
        </div>
      </div>
    `).join('');
  } catch { el.innerHTML = '<p class="loading">Failed to load orders.</p>'; }
}