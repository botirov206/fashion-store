require('dotenv').config();

const prisma = require('../prisma-client');
const { PRODUCTS, ORDERS } = require('../seed-data');

async function main() {
  const productCount = await prisma.product.count();
  const existingNames = new Set(
    (await prisma.product.findMany({ select: { name: true } })).map((p) => p.name)
  );

  let productsAdded = 0;
  for (const p of PRODUCTS) {
    if (existingNames.has(p.name)) continue;
    await prisma.product.create({ data: p });
    productsAdded += 1;
  }

  if (productsAdded > 0) {
    console.log(`Mahsulotlar: ${productsAdded} ta qo'shildi`);
  } else {
    console.log(`Mahsulotlar allaqachon to'liq (${productCount} ta)`);
  }

  const orderCount = await prisma.order.count();
  if (orderCount === 0) {
    const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
    let inserted = 0;

    for (const order of ORDERS) {
      const product = products[order.productIndex];
      if (!product) continue;

      await prisma.order.create({
        data: {
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          product_id: product.id,
          quantity: order.quantity,
          total_price: Number(product.price) * order.quantity,
          status: order.status,
        },
      });
      inserted += 1;
    }

    console.log(`Buyurtmalar: ${inserted} ta qo'shildi`);
  } else {
    console.log(`Buyurtmalar allaqachon mavjud (${orderCount} ta)`);
  }
}

main()
  .catch((err) => {
    console.error('Seed xatoligi:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
