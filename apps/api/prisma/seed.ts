import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

// Import enums separately
const UserRole = {
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN"
} as const;

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("Admin123!", 10);
  const customerHash = await bcrypt.hash("Customer123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@estore.local" },
    update: {
      firstName: "Store",
      lastName: "Admin",
      role: "ADMIN",
      passwordHash: adminHash
    },
    create: {
      email: "admin@estore.local",
      firstName: "Store",
      lastName: "Admin",
      role: "ADMIN",
      passwordHash: adminHash
    }
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@estore.local" },
    update: {
      firstName: "Sample",
      lastName: "Customer",
      role: "CUSTOMER",
      passwordHash: customerHash
    },
    create: {
      email: "customer@estore.local",
      firstName: "Sample",
      lastName: "Customer",
      role: "CUSTOMER",
      passwordHash: customerHash
    }
  });

  await prisma.cart.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id }
  });

  await prisma.cart.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id }
  });

  const seedItems = [
    {
      sku: "acc-mou-001",
      name: "Velocity Pro Wireless Mouse",
      description: "Ergonomic gaming mouse with low-latency wireless and programmable buttons.",
      category: "mice",
      brand: "Logitech",
      model: "G703 Lightspeed",
      quantity: 42,
      price: 129,
      imageUrl: "https://images.unsplash.com/photo-1527814050087-3793815479db"
    },
    {
      sku: "acc-key-001",
      name: "Apex Mechanical Keyboard",
      description: "Hot-swappable 75% keyboard with tactile switches and RGB backlight.",
      category: "keyboards",
      brand: "Keychron",
      model: "K2 Pro",
      quantity: 35,
      price: 149,
      imageUrl: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae"
    },
    {
      sku: "acc-pad-001",
      name: "Nova Gamepad",
      description: "Hall-effect sticks, Bluetooth + USB-C support, and remappable inputs.",
      category: "gamepads",
      brand: "8BitDo",
      model: "Ultimate",
      quantity: 28,
      price: 89,
      imageUrl: "https://e-catalog.com/jpg_zoom1/2746378.jpg"
    },
    {
      sku: "acc-hs-001",
      name: "Pulse Gaming Headset",
      description: "Closed-back headset with detachable mic and memory-foam ear cushions.",
      category: "headsets",
      brand: "HyperX",
      model: "Cloud II",
      quantity: 24,
      price: 119,
      imageUrl: "https://m.media-amazon.com/images/I/71ltsViEA8L.jpg"
    },
    {
      sku: "acc-mou-002",
      name: "Orbit Office Mouse",
      description: "Silent-click rechargeable mouse designed for productivity workflows.",
      category: "mice",
      brand: "Logitech",
      model: "MX Anywhere 3S",
      quantity: 18,
      price: 99,
      imageUrl: "https://www.logitech.com/content/dam/logitech/en/products/mice/mx-anywhere-3s/product-gallery/graphite/mx-anywhere-3s-mouse-top-view-graphite.png"
    },
    {
      sku: "acc-key-002",
      name: "Compact Keyboard Lite",
      description: "Portable low-profile keyboard with multi-device Bluetooth pairing.",
      category: "keyboards",
      brand: "Logitech",
      model: "MX Keys Mini",
      quantity: 22,
      price: 139,
      imageUrl: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef"
    },
    {
      sku: "acc-cab-001",
      name: "Braided USB-C Cable",
      description: "2m braided cable with fast charging and high-speed data transfer support.",
      category: "cables",
      brand: "Anker",
      model: "PowerLine III",
      quantity: 120,
      price: 19,
      imageUrl: "https://cdn.shopify.com/s/files/1/0493/7636/2660/files/A88E2011_Richimage_nocopy_2000x2000px_29105b88-b02b-4db3-8bc7-a1922c1dc75f.png?v=1763517239"
    }
  ];

  for (const item of seedItems) {
    await prisma.item.upsert({
      where: { sku: item.sku },
      update: item,
      create: item
    });
  }
  
  console.log("✅ Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });