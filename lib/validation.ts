import { z } from "zod";

export const transactionSchema = z.object({
  amount: z.coerce.number().positive(),
  type: z.enum(["EXPENSE", "INCOME"]),
  category: z.string().min(1),
  subCategory: z.string().optional(),
  paymentMethod: z.string().min(1),
  date: z.coerce.date(),
  time: z.string().min(1),
  merchant: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  receiptImage: z.string().optional(),
  recurring: z.coerce.boolean().default(false),
  tags: z.array(z.string()).default([]),
  confidence: z.coerce.number().min(0).max(1).optional()
});
