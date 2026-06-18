let allProducts = [];
let selectedProduct = null;
let activeCategory = 'all';

const productsGrid = document.getElementById('productsGrid');
const modalOverlay = document.getElementById('modalOverlay');
const modalProductInfo = document.getElementById('modalProductInfo');
const statusBanner = document.getElementById('statusBanner');
const customerNameInput = document.getElementById('customerName');
const customerEmailInput = document.getElementById('customerEmail');
const quantityInput = document.getElementById('quantity');

function formatPrice(value) {
  return `${Number(value).toLocaleString('uz-UZ')} so'm`;
}

function stockLabel(stock) {
  if (stock <= 0) return { text: 'Tugagan', className: 'stock out' };
  if (stock <= 5) return { text: `Qolgan: ${stock} dona`, className: 'stock low' };
  return { text: `Mavjud: ${stock} dona`, className: 'stock' };
}

function showBanner(message, type = 'success') {
  statusBanner.textContent = message;
  statusBanner.className = `status-banner ${type}`;
  if (type === 'success') {
    setTimeout(() => {
      statusBanner.className = 'status-banner';
    }, 4000);
  }
}

function renderProducts(products) {
  if (!products.length) {
    productsGrid.innerHTML = '<div class="empty">Bu kategoriyada mahsulot topilmadi.</div>';
    return;
  }

  productsGrid.innerHTML = products
    .map((product) => {
      const stock = stockLabel(product.stock);
      return `
        <article class="product-card" data-id="${product.id}">
          <h3>${escapeHtml(product.name)}</h3>
          <div class="category">${escapeHtml(product.category)}</div>
          <div class="price">${formatPrice(product.price)}</div>
          <p class="desc">${escapeHtml(product.description)}</p>
          <div class="${stock.className}">${stock.text}</div>
          <button class="buy-btn" data-action="buy" ${product.stock <= 0 ? 'disabled' : ''}>
            Buyurtma berish
          </button>
        </article>
      `;
    })
    .join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadProducts() {
  productsGrid.innerHTML = '<div class="loading">Mahsulotlar yuklanmoqda...</div>';

  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('API xatoligi');

    allProducts = await res.json();
    renderProducts(allProducts);
  } catch {
    productsGrid.innerHTML = '<div class="empty">Mahsulotlarni yuklab bo\'lmadi. Sahifani yangilang.</div>';
  }
}

function filterProducts(category, button) {
  activeCategory = category;
  document.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('active'));
  button.classList.add('active');

  if (category === 'all') {
    renderProducts(allProducts);
    return;
  }

  renderProducts(allProducts.filter((product) => product.category === category));
}

function openModal(product) {
  selectedProduct = product;
  modalProductInfo.innerHTML = `<strong>${escapeHtml(product.name)}</strong> — ${formatPrice(product.price)}`;
  customerNameInput.value = '';
  customerEmailInput.value = '';
  quantityInput.value = '1';
  quantityInput.max = String(product.stock);
  modalOverlay.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
  selectedProduct = null;
}

async function submitOrder() {
  if (!selectedProduct) return;

  const customer_name = customerNameInput.value.trim();
  const customer_email = customerEmailInput.value.trim();
  const quantity = Number(quantityInput.value);

  if (!customer_name || !customer_email || !quantity) {
    showBanner('Barcha maydonlarni to\'ldiring.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name,
        customer_email,
        product_id: selectedProduct.id,
        quantity,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showBanner(data.error || 'Xatolik yuz berdi.', 'error');
      return;
    }

    closeModal();
    showBanner('Buyurtmangiz qabul qilindi. Tez orada siz bilan bog\'lanamiz.');
    await loadProducts();

    if (activeCategory !== 'all') {
      const activeBtn = document.querySelector('.filter-btn.active');
      filterProducts(activeCategory, activeBtn);
    }
  } catch {
    showBanner('Tarmoq xatoligi. Qayta urinib ko\'ring.', 'error');
  }
}

document.querySelectorAll('.filter-btn').forEach((button) => {
  button.addEventListener('click', () => filterProducts(button.dataset.category, button));
});

productsGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="buy"]');
  if (!button) return;

  const card = button.closest('.product-card');
  const product = allProducts.find((item) => item.id === Number(card.dataset.id));
  if (product) openModal(product);
});

document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('confirmBtn').addEventListener('click', submitOrder);

modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
});

loadProducts();
