import { Types } from 'mongoose';
import { Category } from '../models/index.js';

interface DefaultCategory {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isDefault: boolean;
}

export const DEFAULT_EXPENSE_CATEGORIES: Omit<DefaultCategory, 'isDefault'>[] = [
  { name: 'Food & Dining', type: 'expense', icon: 'UtensilsCrossed', color: '#ef4444' },
  { name: 'Groceries', type: 'expense', icon: 'ShoppingBasket', color: '#f97316' },
  { name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#ec4899' },
  { name: 'Transport', type: 'expense', icon: 'Car', color: '#3b82f6' },
  { name: 'Fuel', type: 'expense', icon: 'Fuel', color: '#f59e0b' },
  { name: 'Rent', type: 'expense', icon: 'House', color: '#8b5cf6' },
  { name: 'Utilities', type: 'expense', icon: 'Zap', color: '#eab308' },
  { name: 'Electricity', type: 'expense', icon: 'Zap', color: '#fbbf24' },
  { name: 'Water', type: 'expense', icon: 'Droplets', color: '#06b6d4' },
  { name: 'Internet', type: 'expense', icon: 'Wifi', color: '#0ea5e9' },
  { name: 'Mobile / Phone', type: 'expense', icon: 'Smartphone', color: '#64748b' },
  { name: 'Bills', type: 'expense', icon: 'Receipt', color: '#6366f1' },
  { name: 'Entertainment', type: 'expense', icon: 'Clapperboard', color: '#a855f7' },
  { name: 'Subscriptions', type: 'expense', icon: 'RefreshCw', color: '#7c3aed' },
  { name: 'Healthcare', type: 'expense', icon: 'HeartPulse', color: '#f43f5e' },
  { name: 'Medicines', type: 'expense', icon: 'Pill', color: '#10b981' },
  { name: 'Fitness', type: 'expense', icon: 'Dumbbell', color: '#22c55e' },
  { name: 'Travel', type: 'expense', icon: 'Plane', color: '#0891b2' },
  { name: 'Education', type: 'expense', icon: 'GraduationCap', color: '#7c3aed' },
  { name: 'Insurance', type: 'expense', icon: 'Shield', color: '#64748b' },
  { name: 'Personal Care', type: 'expense', icon: 'Sparkles', color: '#ec4899' },
  { name: 'Family', type: 'expense', icon: 'Users', color: '#f97316' },
  { name: 'Gifts', type: 'expense', icon: 'Gift', color: '#e11d48' },
  { name: 'Home', type: 'expense', icon: 'House', color: '#84cc16' },
  { name: 'EMI / Loan', type: 'expense', icon: 'Landmark', color: '#dc2626' },
  { name: 'Credit Card Payment', type: 'expense', icon: 'CreditCard', color: '#7c3aed' },
  { name: 'Taxes', type: 'expense', icon: 'FileText', color: '#475569' },
  { name: 'Pets', type: 'expense', icon: 'PawPrint', color: '#92400e' },
  { name: 'Other Expense', type: 'expense', icon: 'CircleEllipsis', color: '#6b7280' },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<DefaultCategory, 'isDefault'>[] = [
  { name: 'Salary', type: 'income', icon: 'BriefcaseBusiness', color: '#22c55e' },
  { name: 'Freelance', type: 'income', icon: 'Laptop', color: '#3b82f6' },
  { name: 'Business', type: 'income', icon: 'Building2', color: '#8b5cf6' },
  { name: 'Bonus', type: 'income', icon: 'BadgeDollarSign', color: '#f59e0b' },
  { name: 'Investment Returns', type: 'income', icon: 'TrendingUp', color: '#10b981' },
  { name: 'Interest', type: 'income', icon: 'Percent', color: '#06b6d4' },
  { name: 'Rental Income', type: 'income', icon: 'House', color: '#84cc16' },
  { name: 'Dividend', type: 'income', icon: 'BarChart3', color: '#0ea5e9' },
  { name: 'Gift Received', type: 'income', icon: 'Gift', color: '#f43f5e' },
  { name: 'Refund', type: 'income', icon: 'RotateCcw', color: '#64748b' },
  { name: 'Cashback', type: 'income', icon: 'BadgePercent', color: '#a855f7' },
  { name: 'Side Income', type: 'income', icon: 'CircleDollarSign', color: '#f97316' },
  { name: 'Other Income', type: 'income', icon: 'Wallet', color: '#6b7280' },
];

export async function seedDefaultCategories(userId: Types.ObjectId | string): Promise<void> {
  const allDefaults: DefaultCategory[] = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, isDefault: true })),
    ...DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, isDefault: true })),
  ];

  // Use Promise.allSettled so one failure (duplicate) doesn't abort others
  await Promise.allSettled(
    allDefaults.map((cat) =>
      Category.findOneAndUpdate(
        { userId, name: cat.name, type: cat.type },
        { $setOnInsert: { ...cat, userId } },
        { upsert: true, new: true }
      )
    )
  );
}
