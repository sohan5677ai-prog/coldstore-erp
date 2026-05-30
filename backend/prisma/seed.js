// prisma/seed.js
// Run with: node prisma/seed.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── 1. Admin user ────────────────────────────────────────────
  const hash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: hash,
      role: "admin",
      isActive: true,
    },
  });
  console.log("✅ Admin user created  (username: admin / password: admin123)");

  // ── 2. Chambers A, B, C ──────────────────────────────────────
  const chambers = ["A", "B", "C"];
  for (const code of chambers) {
    await prisma.chamber.upsert({
      where: { chamberCode: code },
      update: {},
      create: { chamberCode: code, totalLots: 200 },
    });
  }
  console.log("✅ 3 chambers created (A, B, C)");

  // ── 3. 600 Lots (A1-A200, B1-B200, C1-C200) ─────────────────
  const allChambers = await prisma.chamber.findMany();
  let lotsCreated = 0;
  for (const ch of allChambers) {
    for (let i = 1; i <= 200; i++) {
      const code = `${ch.chamberCode}${i}`;
      await prisma.lot.upsert({
        where: { lotCode: code },
        update: {},
        create: {
          lotCode: code,
          lotNumber: i,
          status: "empty",
          chamberId: ch.id,
        },
      });
      lotsCreated++;
    }
  }
  console.log(`✅ ${lotsCreated} lots created (A1-A200, B1-B200, C1-C200)`);

  // ── 4. Commodities & Varieties ───────────────────────────────
  const commodityData = [
    {
      name: "Tamarind",
      type: "Seasonal",
      hsnCode: "0813",
      varieties: [
        {
          name: "Shell Tamarind",
          storageRate: 5,
          handlingIn: 2,
          handlingOut: 2,
          gstPercent: 5,
        },
        {
          name: "Seed Tamarind",
          storageRate: 4,
          handlingIn: 2,
          handlingOut: 2,
          gstPercent: 5,
        },
        {
          name: "Chapathi",
          storageRate: 4.5,
          handlingIn: 2,
          handlingOut: 2,
          gstPercent: 5,
        },
        {
          name: "Karupulli",
          storageRate: 5,
          handlingIn: 2,
          handlingOut: 2,
          gstPercent: 5,
        },
      ],
    },
    {
      name: "Horsegram",
      type: "Seasonal",
      hsnCode: "0713",
      varieties: [
        {
          name: "Horsegram Whole",
          storageRate: 4,
          handlingIn: 1.5,
          handlingOut: 1.5,
          gstPercent: 5,
        },
        {
          name: "Horsegram Cleaned",
          storageRate: 4.5,
          handlingIn: 1.5,
          handlingOut: 1.5,
          gstPercent: 5,
        },
      ],
    },
    {
      name: "Tamarind Seeds",
      type: "Seasonal",
      hsnCode: "1207",
      varieties: [
        {
          name: "Raw Seeds",
          storageRate: 3,
          handlingIn: 1,
          handlingOut: 1,
          gstPercent: 5,
        },
        {
          name: "Cleaned Seeds",
          storageRate: 3.5,
          handlingIn: 1,
          handlingOut: 1,
          gstPercent: 5,
        },
      ],
    },
  ];

  for (const cd of commodityData) {
    const commodity = await prisma.commodity.upsert({
      where: {
        id:
          (await prisma.commodity.findFirst({ where: { name: cd.name } }))
            ?.id || 0,
      },
      update: {},
      create: { name: cd.name, type: cd.type, hsnCode: cd.hsnCode },
    });
    for (const v of cd.varieties) {
      const exists = await prisma.variety.findFirst({
        where: { name: v.name, commodityId: commodity.id },
      });
      if (!exists) {
        await prisma.variety.create({
          data: { ...v, commodityId: commodity.id },
        });
      }
    }
  }
  console.log("✅ Commodities + varieties seeded:");
  console.log(
    "   Tamarind → Shell Tamarind, Seed Tamarind, Chapathi, Karupulli",
  );
  console.log("   Horsegram → Horsegram Whole, Horsegram Cleaned");
  console.log("   Tamarind Seeds → Raw Seeds, Cleaned Seeds");

  // ── 5. Sample customer ───────────────────────────────────────
  await prisma.customer.upsert({
    where: { mobileNumber: "9876543210" },
    update: {},
    create: {
      partyCode: "CS-0001",
      customerType: "Kishan",
      name: "Raju Farmer",
      city: "Damalacheruvu",
      district: "Guntur",
      state: "Andhra Pradesh",
      mobileNumber: "9876543210",
      subGroup: "FARMER",
    },
  });
  console.log("✅ Sample customer created");

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
