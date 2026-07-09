"use client";

import { defaultBudget, sampleBills, sampleTransactions } from "@/lib/sample-data";
import type { Bill, Budget, Transaction } from "@/types/expense";

const txKey = "expenseflow.transactions";
const budgetKey = "expenseflow.budget";
const billKey = "expenseflow.bills";

export function loadTransactions(): Transaction[] {
  return read(txKey, sampleTransactions);
}

export function saveTransactions(transactions: Transaction[]) {
  localStorage.setItem(txKey, JSON.stringify(transactions));
}

export function loadBudget(): Budget {
  return read(budgetKey, defaultBudget);
}

export function saveBudget(budget: Budget) {
  localStorage.setItem(budgetKey, JSON.stringify(budget));
}

export function loadBills(): Bill[] {
  return read(billKey, sampleBills);
}

export function saveBills(bills: Bill[]) {
  localStorage.setItem(billKey, JSON.stringify(bills));
}

export function backupJson(transactions: Transaction[]) {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), transactions }, null, 2);
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
