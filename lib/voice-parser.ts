import { categories, type Category, type TransactionType } from "@/types/expense";

export type ParsedVoiceTransaction = {
  amount: number;
  type: TransactionType;
  category: Category | string;
  merchant?: string;
  notes: string;
  date: string;
  confidence: number;
};

const incomeWords = ["salary", "received", "credited", "income", "refund", "rent received", "freelance", "gift"];

const categoryKeywords: Record<Category, string[]> = {
  Food: ["tea", "coffee", "swiggy", "zomato", "restaurant", "breakfast", "lunch", "dinner", "snack"],
  Groceries: ["vegetable", "vegetables", "grocery", "groceries", "milk", "fruit", "supermarket"],
  Fuel: ["petrol", "diesel", "fuel", "gas"],
  Travel: ["uber", "ola", "taxi", "metro", "train", "bus", "flight"],
  Entertainment: ["movie", "ticket", "netflix", "prime", "game"],
  Shopping: ["amazon", "flipkart", "myntra", "shopping", "shirt", "shoes"],
  Medical: ["hospital", "doctor", "medicine", "pharmacy", "clinic"],
  Education: ["school", "college", "course", "book", "tuition"],
  Rent: ["rent", "landlord"],
  Electricity: ["electricity", "power bill", "current bill"],
  Internet: ["internet", "broadband", "wifi"],
  Phone: ["recharge", "mobile", "phone"],
  Investment: ["sip", "mutual fund", "stock", "investment"],
  Insurance: ["insurance", "premium"],
  Tax: ["tax", "gst"],
  Loan: ["loan"],
  EMI: ["emi"],
  Salary: ["salary", "paycheck"],
  Freelancing: ["freelance", "client"],
  Business: ["business", "sales"],
  Miscellaneous: []
};

const merchantHints = ["at", "from", "for", "to"];

export function parseVoiceTransaction(input: string, now = new Date()): ParsedVoiceTransaction | null {
  const text = input.trim().toLowerCase();
  const amountMatch = text.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:,\d{2,3})*(?:\.\d+)?)/i);

  if (!amountMatch) {
    return null;
  }

  const amount = Number(amountMatch[1].replace(/,/g, ""));
  const type = incomeWords.some((word) => text.includes(word)) ? "INCOME" : "EXPENSE";
  const category = detectCategory(text, type);
  const merchant = detectMerchant(text, amountMatch[0]);
  const confidence = score(text, category, merchant);

  return {
    amount,
    type,
    category,
    merchant,
    notes: input.trim(),
    date: now.toISOString().slice(0, 10),
    confidence
  };
}

function detectCategory(text: string, type: TransactionType) {
  if (type === "INCOME" && text.includes("salary")) return "Salary";
  if (type === "INCOME" && text.includes("rent")) return "Business";

  for (const category of categories) {
    if (categoryKeywords[category].some((keyword) => text.includes(keyword))) {
      return category;
    }
  }

  return "Miscellaneous";
}

function detectMerchant(text: string, amountText: string) {
  const withoutAmount = text.replace(amountText.toLowerCase(), " ").replace(/\s+/g, " ").trim();

  for (const hint of merchantHints) {
    const regex = new RegExp(`${hint}\\s+([a-z0-9& .-]{2,30})`);
    const match = withoutAmount.match(regex);
    if (match?.[1]) {
      return titleCase(match[1].replace(/\b(today|yesterday|bill)\b/g, "").trim());
    }
  }

  const compact = withoutAmount.replace(/\b(spent|paid|bought|received|credited|salary|for|on)\b/g, "").trim();
  return compact.length > 1 ? titleCase(compact.split(" ").slice(0, 3).join(" ")) : undefined;
}

function score(text: string, category: string, merchant?: string) {
  let value = 0.52;
  if (category !== "Miscellaneous") value += 0.22;
  if (merchant) value += 0.12;
  if (/\b(spent|paid|bought|received|credited)\b/.test(text)) value += 0.08;
  return Math.min(0.96, Number(value.toFixed(2)));
}

function titleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
