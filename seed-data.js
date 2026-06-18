const PRODUCTS = [
  { name: "Erkaklar ko'ylagi", category: 'Erkaklar', price: 89000, description: "Klassik oq ko'ylak, 100% paxta", stock: 50 },
  { name: 'Ayollar bluzasi', category: 'Ayollar', price: 75000, description: 'Zamonaviy stil, turli ranglar', stock: 40 },
  { name: 'Denim shim', category: 'Unisex', price: 120000, description: 'Sifatli denim, slim fit', stock: 35 },
  { name: 'Sport kostyum', category: 'Sport', price: 150000, description: "Yengil va qulay, to'q ko'k", stock: 25 },
  { name: 'Qishki kurtka', category: 'Qishki', price: 250000, description: 'Issiq va chidamli, qora rang', stock: 20 },
  { name: 'Paxta futbolka', category: 'Casual', price: 45000, description: "Yumshoq paxta, ko'p ranglar", stock: 60 },
  { name: 'Biznes kostyum', category: 'Rasmiy', price: 350000, description: "Erkaklar uchun to'q kulrang", stock: 15 },
  { name: "Yozgi ko'ylak", category: 'Yozgi', price: 65000, description: 'Yengil mato, gul naqshli', stock: 45 },
  { name: 'Charm sumka', category: 'Aksessuarlar', price: 180000, description: 'Premium charm, ichki bo\'limli', stock: 18 },
  { name: 'Teri kamar', category: 'Aksessuarlar', price: 95000, description: 'Tabiiy teri, klassik tokcha', stock: 30 },
  { name: 'Bolalar kombinezon', category: 'Bolalar', price: 85000, description: '2-6 yosh, yumshoq mato', stock: 22 },
  { name: 'Maksi yubka', category: 'Ayollar', price: 110000, description: 'Yozgi kolleksiya, yengil gazlama', stock: 28 },
  { name: "Polo ko'ylak", category: 'Casual', price: 72000, description: 'Kundalik kiyim, rangli model', stock: 38 },
  { name: 'Trenirovka shortik', category: 'Sport', price: 55000, description: 'Nafas oluvchi mato, sport zal uchun', stock: 42 },
  { name: 'Ipak platok', category: 'Aksessuarlar', price: 42000, description: 'Yengil ipak, rang-barang naqsh', stock: 55 },
  { name: 'Velour kostyum', category: 'Sport', price: 195000, description: 'Qulay velour, sovuq kunlar uchun', stock: 16 },
  { name: 'Jinsi kurtka', category: 'Qishki', price: 220000, description: 'Oversize model, ichki yoqali', stock: 14 },
  { name: 'Klassik galstuk', category: 'Rasmiy', price: 38000, description: 'Rasmiy tadbirlar uchun', stock: 48 },
  { name: 'Krossovkalar', category: 'Sport', price: 280000, description: 'Unisex, kundalik va sport uchun', stock: 24 },
  { name: 'Yozgi shlyapa', category: 'Aksessuarlar', price: 35000, description: 'Quyoshdan himoya, yengil', stock: 33 },
];

const ORDERS = [
  { customer_name: 'Dilnoza Karimova', customer_email: 'dilnoza.karimova@mail.uz', productIndex: 0, quantity: 2, status: 'completed' },
  { customer_name: 'Jasur Toshmatov', customer_email: 'jasur.toshmatov@gmail.com', productIndex: 2, quantity: 1, status: 'new' },
  { customer_name: 'Malika Rahimova', customer_email: 'malika.rahimova@outlook.com', productIndex: 1, quantity: 3, status: 'processing' },
  { customer_name: 'Sardor Nazarov', customer_email: 'sardor.nazarov@example.com', productIndex: 6, quantity: 1, status: 'completed' },
  { customer_name: 'Nilufar Abdullayeva', customer_email: 'nilufar.a@mail.uz', productIndex: 11, quantity: 1, status: 'new' },
  { customer_name: 'Bekzod Mirzayev', customer_email: 'bekzod.mirzayev@gmail.com', productIndex: 18, quantity: 1, status: 'processing' },
  { customer_name: 'Gulnora Saidova', customer_email: 'gulnora.saidova@mail.uz', productIndex: 8, quantity: 1, status: 'cancelled' },
  { customer_name: 'Timur Qodirov', customer_email: 'timur.qodirov@example.com', productIndex: 5, quantity: 4, status: 'completed' },
  { customer_name: 'Sevara Yusupova', customer_email: 'sevara.yusupova@gmail.com', productIndex: 13, quantity: 2, status: 'new' },
  { customer_name: 'Rustam Ergashev', customer_email: 'rustam.ergashev@mail.uz', productIndex: 16, quantity: 1, status: 'processing' },
  { customer_name: 'Kamola Tursunova', customer_email: 'kamola.tursunova@outlook.com', productIndex: 3, quantity: 1, status: 'completed' },
  { customer_name: 'Azizbek Pulatov', customer_email: 'azizbek.pulatov@example.com', productIndex: 9, quantity: 2, status: 'new' },
];

async function seedProducts(pool) {
  const existing = await pool.query('SELECT name FROM products');
  const existingNames = new Set(existing.rows.map((row) => row.name));

  let inserted = 0;
  for (const p of PRODUCTS) {
    if (existingNames.has(p.name)) continue;

    await pool.query(
      `INSERT INTO products (name, category, price, description, stock)
       VALUES ($1, $2, $3, $4, $5)`,
      [p.name, p.category, p.price, p.description, p.stock]
    );
    inserted += 1;
  }

  return inserted;
}

async function seedOrders(pool) {
  const existing = await pool.query('SELECT COUNT(*)::int AS count FROM orders');
  if (existing.rows[0].count > 0) return 0;

  const products = await pool.query('SELECT id, price FROM products ORDER BY id');
  if (products.rows.length === 0) return 0;

  let inserted = 0;
  for (const order of ORDERS) {
    const product = products.rows[order.productIndex];
    if (!product) continue;

    const total_price = Number(product.price) * order.quantity;
    await pool.query(
      `INSERT INTO orders (customer_name, customer_email, product_id, quantity, total_price, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [order.customer_name, order.customer_email, product.id, order.quantity, total_price, order.status]
    );
    inserted += 1;
  }

  return inserted;
}

module.exports = { PRODUCTS, ORDERS, seedProducts, seedOrders };
