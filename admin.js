const express = require('express');
const prisma = require('./prisma-client');

const router = express.Router();

const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect('/admin/login');
}

function layout(title, activePage, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Fashion Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#f0f2f5;color:#222}
.sidebar{width:220px;background:#111827;color:#fff;height:100vh;position:fixed;top:0;left:0;display:flex;flex-direction:column}
.sidebar-brand{padding:24px 20px 20px;font-size:17px;font-weight:700;border-bottom:1px solid #374151}
.sidebar-brand span{color:#60a5fa}
.sidebar nav{flex:1;padding-top:8px}
.sidebar a{display:flex;align-items:center;gap:10px;padding:11px 20px;color:#9ca3af;text-decoration:none;font-size:14px;transition:all .15s}
.sidebar a:hover{background:#1f2937;color:#fff}
.sidebar a.active{background:#1d4ed8;color:#fff}
.sidebar-footer{padding:16px 20px;border-top:1px solid #374151}
.sidebar-footer a{color:#9ca3af;text-decoration:none;font-size:13px}
.sidebar-footer a:hover{color:#ef4444}
.main{margin-left:220px;padding:32px;min-height:100vh}
.page-title{font-size:22px;font-weight:700;margin-bottom:24px;color:#111}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:28px}
.stat-card{background:#fff;border-radius:10px;padding:22px 20px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.stat-card .val{font-size:32px;font-weight:800;color:#111827;line-height:1}
.stat-card .lbl{color:#6b7280;font-size:13px;margin-top:6px}
.card{background:#fff;border-radius:10px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:24px}
.card-title{font-size:16px;font-weight:600;margin-bottom:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:14px}
th{background:#f9fafb;padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb}
td{padding:11px 14px;border-bottom:1px solid #f3f4f6;color:#374151}
tr:last-child td{border-bottom:none}
tr:hover td{background:#f9fafb}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
.badge-new{background:#dbeafe;color:#1d4ed8}
.badge-processing{background:#fef3c7;color:#92400e}
.badge-completed{background:#d1fae5;color:#065f46}
.badge-cancelled{background:#fee2e2;color:#991b1b}
.badge-low{background:#fee2e2;color:#991b1b}
.badge-ok{background:#d1fae5;color:#065f46}
.empty{text-align:center;padding:40px;color:#9ca3af;font-size:14px}
</style>
</head>
<body>
<div class="sidebar">
  <div class="sidebar-brand">Fashion <span>Admin</span></div>
  <nav>
    <a href="/admin" class="${activePage === 'dashboard' ? 'active' : ''}">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
      Dashboard
    </a>
    <a href="/admin/orders" class="${activePage === 'orders' ? 'active' : ''}">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
      Orders
    </a>
    <a href="/admin/products" class="${activePage === 'products' ? 'active' : ''}">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      Products
    </a>
  </nav>
  <div class="sidebar-footer">
    <a href="/admin/logout">&#x2192; Logout</a>
  </div>
</div>
<div class="main">
  <div class="page-title">${title}</div>
  ${content}
</div>
</body>
</html>`;
}

// ── Login ──────────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session && req.session.admin) return res.redirect('/admin');
  const err = req.query.error ? '<p style="color:#dc2626;font-size:14px;margin-bottom:14px">Invalid username or password.</p>' : '';
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Admin Login</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#111827;display:flex;align-items:center;justify-content:center;min-height:100vh}
.box{background:#fff;border-radius:14px;padding:44px 40px;width:380px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
h2{font-size:22px;font-weight:700;margin-bottom:6px}
p.sub{color:#6b7280;font-size:14px;margin-bottom:28px}
label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px}
input{width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;margin-bottom:18px;outline:none;transition:border .15s}
input:focus{border-color:#1d4ed8}
button{width:100%;padding:12px;background:#111827;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s}
button:hover{background:#1f2937}
</style>
</head>
<body>
<div class="box">
  <h2>Fashion Admin</h2>
  <p class="sub">Sign in to your dashboard</p>
  ${err}
  <form method="POST" action="/admin/login">
    <label>Username</label>
    <input type="text" name="username" autofocus required>
    <label>Password</label>
    <input type="password" name="password" required>
    <button type="submit">Sign In</button>
  </form>
</div>
</body>
</html>`);
});

router.post('/login', express.urlencoded({ extended: false }), (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.admin = true;
    return res.redirect('/admin');
  }
  res.redirect('/admin/login?error=1');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [orderCount, productCount, revenue, recentOrders] = await Promise.all([
      prisma.order.count(),
      prisma.product.count(),
      prisma.order.aggregate({ _sum: { total_price: true } }),
      prisma.order.findMany({
        take: 8,
        orderBy: { created_at: 'desc' },
        include: { product: { select: { name: true } } },
      }),
    ]);

    const totalRevenue = Number(revenue._sum.total_price || 0);

    const rows = recentOrders.length
      ? recentOrders.map(o => `
        <tr>
          <td>#${o.id}</td>
          <td>${escape(o.customer_name)}</td>
          <td>${escape(o.customer_email)}</td>
          <td>${escape(o.product.name)}</td>
          <td>${o.quantity}</td>
          <td>${Number(o.total_price).toLocaleString()} UZS</td>
          <td><span class="badge badge-${o.status}">${o.status}</span></td>
          <td>${new Date(o.created_at).toLocaleDateString('en-GB')}</td>
        </tr>`).join('')
      : '<tr><td colspan="8" class="empty">No orders yet</td></tr>';

    res.send(layout('Dashboard', 'dashboard', `
      <div class="stats">
        <div class="stat-card"><div class="val">${orderCount}</div><div class="lbl">Total Orders</div></div>
        <div class="stat-card"><div class="val">${productCount}</div><div class="lbl">Products</div></div>
        <div class="stat-card"><div class="val">${totalRevenue.toLocaleString()}</div><div class="lbl">Revenue (UZS)</div></div>
      </div>
      <div class="card">
        <div class="card-title">Recent Orders</div>
        <table>
          <thead><tr><th>ID</th><th>Customer</th><th>Email</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `));
  } catch (err) { next(err); }
});

// ── Orders ─────────────────────────────────────────────────────────────────
router.get('/orders', requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { created_at: 'desc' },
      include: { product: { select: { name: true } } },
    });

    const rows = orders.length
      ? orders.map(o => `
        <tr>
          <td>#${o.id}</td>
          <td>${escape(o.customer_name)}</td>
          <td>${escape(o.customer_email)}</td>
          <td>${escape(o.product.name)}</td>
          <td>${o.quantity}</td>
          <td>${Number(o.total_price).toLocaleString()} UZS</td>
          <td><span class="badge badge-${o.status}">${o.status}</span></td>
          <td>${new Date(o.created_at).toLocaleDateString('en-GB')}</td>
        </tr>`).join('')
      : '<tr><td colspan="8" class="empty">No orders yet</td></tr>';

    res.send(layout('Orders', 'orders', `
      <div class="card">
        <table>
          <thead><tr><th>ID</th><th>Customer</th><th>Email</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `));
  } catch (err) { next(err); }
});

// ── Products ───────────────────────────────────────────────────────────────
router.get('/products', requireAuth, async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });

    const rows = products.map(p => {
      const stockBadge = p.stock <= 5
        ? `<span class="badge badge-low">${p.stock} low</span>`
        : `<span class="badge badge-ok">${p.stock}</span>`;
      return `
        <tr>
          <td>#${p.id}</td>
          <td>${escape(p.name)}</td>
          <td>${p.category || '—'}</td>
          <td>${Number(p.price).toLocaleString()} UZS</td>
          <td>${stockBadge}</td>
          <td>${p.description ? escape(p.description.slice(0, 50)) + (p.description.length > 50 ? '…' : '') : '—'}</td>
          <td>${new Date(p.created_at).toLocaleDateString('en-GB')}</td>
        </tr>`;
    }).join('');

    res.send(layout('Products', 'products', `
      <div class="card">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Description</th><th>Added</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `));
  } catch (err) { next(err); }
});

function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = router;
