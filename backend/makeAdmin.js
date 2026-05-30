const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function createAdmin() {
  let bcrypt;
  // Automatically detect which encryption library you have installed
  try {
    bcrypt = require("bcrypt");
  } catch (e) {
    bcrypt = require("bcryptjs");
  }

  try {
    // Hash the password securely
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // 🛡️ FIXED: Changed 'password' to 'passwordHash' to match your Prisma schema
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: hashedPassword,
      },
    });

    console.log("✅ Admin user successfully created! You can now log in.");
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
