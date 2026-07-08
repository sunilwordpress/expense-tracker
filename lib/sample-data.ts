import { subDays } from "date-fns";
import type { Bill, Budget, Transaction } from "@/types/expense";

const today = new Date();

export const defaultBudget: Budget = {
  monthly: 65000,
  byCategory: {
    Food: 8000,
    Groceries: 12000,
    Fuel: 7000,
    Shopping: 10000,
    Rent: 25000
  }
};

export const sampleBills: Bill[] = [
  { id: "bill_1", name: "Electricity", amount: 1800, category: "Electricity", dueDate: subDays(today, -3).toISOString(), recurring: true },
  { id: "bill_2", name: "Internet", amount: 999, category: "Internet", dueDate: subDays(today, -7).toISOString(), recurring: true },
  { id: "bill_3", name: "Rent", amount: 25000, category: "Rent", dueDate: subDays(today, -12).toISOString(), recurring: true }
];

export const sampleTransactions: Transaction[] = [
  tx("tx_1", 45000, "INCOME", "Salary", "Acme Payroll", -5, "UPI", ["salary"]),
  tx("tx_2", 250, "EXPENSE", "Fuel", "Shell Petrol", 0, "UPI", ["vehicle"]),
  tx("tx_3", 120, "EXPENSE", "Food", "Tea Point", 0, "Cash", ["tea"]),
  tx("tx_4", 1500, "EXPENSE", "Rent", "Landlord", -2, "Net Banking", ["home"]),
  tx("tx_5", 239, "EXPENSE", "Phone", "Airtel", -3, "UPI", ["recharge"]),
  tx("tx_6", 350, "EXPENSE", "Groceries", "Local Market", -4, "Cash", ["vegetables"]),
  tx("tx_7", 2200, "EXPENSE", "Shopping", "Amazon", -9, "Credit Card", ["online"]),
  tx("tx_8", 8000, "INCOME", "Business", "Tenant", -12, "UPI", ["rent"]),
  tx("tx_9", 1200, "EXPENSE", "Electricity", "BESCOM", -14, "UPI", ["bill"]),
  tx("tx_10", 180, "EXPENSE", "Travel", "Uber", -1, "Wallet", ["cab"])
];

function tx(
  id: string,
  amount: number,
  type: Transaction["type"],
  category: string,
  merchant: string,
  daysAgo: number,
  paymentMethod: Transaction["paymentMethod"],
  tags: string[]
): Transaction {
  const date = subDays(today, Math.abs(daysAgo)).toISOString();
  return {
    id,
    amount,
    type,
    category,
    merchant,
    paymentMethod,
    date: date.slice(0, 10),
    time: "09:30",
    notes: `${merchant} ${amount}`,
    tags,
    confidence: 0.9,
    synced: true,
    createdAt: date
  };
}
