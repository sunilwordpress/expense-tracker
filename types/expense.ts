export type TransactionType = "EXPENSE" | "INCOME";

export type PaymentMethod =
  | "Cash"
  | "UPI"
  | "Credit Card"
  | "Debit Card"
  | "Net Banking"
  | "Wallet"
  | "Cheque"
  | "Other";

export type Category =
  | "Food"
  | "Groceries"
  | "Fuel"
  | "Travel"
  | "Entertainment"
  | "Shopping"
  | "Medical"
  | "Education"
  | "Rent"
  | "Electricity"
  | "Internet"
  | "Phone"
  | "Investment"
  | "Insurance"
  | "Tax"
  | "Loan"
  | "EMI"
  | "Salary"
  | "Freelancing"
  | "Business"
  | "Miscellaneous";

export type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
  category: Category | string;
  subCategory?: string;
  paymentMethod: PaymentMethod;
  date: string;
  time: string;
  merchant?: string;
  location?: string;
  notes?: string;
  receiptImage?: string;
  recurring?: boolean;
  tags: string[];
  confidence?: number;
  synced?: boolean;
  createdAt: string;
};

export type Bill = {
  id: string;
  name: string;
  amount: number;
  category: Category | string;
  dueDate: string;
  recurring: boolean;
};

export type Budget = {
  monthly: number;
  byCategory: Record<string, number>;
};

export const categories: Category[] = [
  "Food",
  "Groceries",
  "Fuel",
  "Travel",
  "Entertainment",
  "Shopping",
  "Medical",
  "Education",
  "Rent",
  "Electricity",
  "Internet",
  "Phone",
  "Investment",
  "Insurance",
  "Tax",
  "Loan",
  "EMI",
  "Salary",
  "Freelancing",
  "Business",
  "Miscellaneous"
];

export const paymentMethods: PaymentMethod[] = [
  "Cash",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Net Banking",
  "Wallet",
  "Cheque",
  "Other"
];
