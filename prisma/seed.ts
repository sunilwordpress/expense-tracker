import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@expenseflow.app" },
    update: {},
    create: {
      email: "demo@expenseflow.app",
      name: "Demo User",
      settings: { create: {} }
    }
  });

  const categories = ["Food", "Groceries", "Fuel", "Travel", "Shopping", "Rent", "Salary", "Electricity", "Phone"];
  await Promise.all(
    categories.map((name) =>
      prisma.category.upsert({
        where: { userId_name: { userId: user.id, name } },
        update: {},
        create: { userId: user.id, name }
      })
    )
  );

  await prisma.transaction.createMany({
    data: [
      { userId: user.id, amount: 50000, type: "INCOME", category: "Salary", paymentMethod: "UPI", date: new Date(), time: "09:00", merchant: "Payroll", notes: "Salary credited" },
      { userId: user.id, amount: 250, type: "EXPENSE", category: "Fuel", paymentMethod: "UPI", date: new Date(), time: "10:30", merchant: "Petrol Pump", notes: "Spent 250 on petrol", confidence: 0.91 },
      { userId: user.id, amount: 120, type: "EXPENSE", category: "Food", paymentMethod: "Cash", date: new Date(), time: "16:00", merchant: "Tea Point", notes: "Tea and snacks", confidence: 0.9 }
    ],
    skipDuplicates: true
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
