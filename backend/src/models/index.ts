import mongoose, { Schema, Document } from 'mongoose';

const base = { timestamps: true };

// ─── User ────────────────────────────────────────────────
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  currency: string;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    currency: { type: String, default: 'INR' },
  },
  base
);

// ─── Category ────────────────────────────────────────────
const CategorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    icon: { type: String, default: 'Circle' },
    color: { type: String, default: '#8b5cf6' },
    isDefault: { type: Boolean, default: false },
  },
  base
);
// Prevent duplicate default categories per user
CategorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });
CategorySchema.index({ userId: 1, type: 1 });

// ─── Transaction ─────────────────────────────────────────
const TransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense', 'credit_card_payment'], required: true },
    amount: { type: Number, min: 0.01, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    date: { type: Date, required: true },
    paymentMethod: { type: String, default: 'Cash', enum: ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Net Banking', 'Other'] },
    creditCardId: { type: Schema.Types.ObjectId, ref: 'CreditCard' },
    description: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    tags: [String],
  },
  base
);
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, categoryId: 1 });
TransactionSchema.index({ userId: 1, creditCardId: 1 });
TransactionSchema.index({ userId: 1, type: 1, date: -1 });

// ─── Budget ──────────────────────────────────────────────
const BudgetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    amount: { type: Number, min: 0, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  base
);
BudgetSchema.index({ userId: 1, categoryId: 1 });
BudgetSchema.index({ userId: 1, startDate: 1, endDate: 1 });

// ─── Credit Card ─────────────────────────────────────────
const CardSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bank: { type: String, trim: true },
    cardName: { type: String, required: true, trim: true },
    last4: { type: String, minlength: 4, maxlength: 4 },
    creditLimit: { type: Number, min: 0, default: 0 },
    outstandingBalance: { type: Number, default: 0 }, // can be negative (credit)
    billingDate: { type: Number, min: 1, max: 31 },
    dueDate: { type: Number, min: 1, max: 31 },
    interestRate: { type: Number, min: 0, max: 100 },
    color: { type: String, default: '#8b5cf6' },
  },
  base
);
CardSchema.index({ userId: 1 });

// ─── Recurring Transaction ───────────────────────────────
const RecurringSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, min: 0 },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
    startDate: Date,
    endDate: Date,
    description: { type: String, trim: true },
    paymentMethod: String,
    nextDueDate: Date,
    isActive: { type: Boolean, default: true },
  },
  base
);
RecurringSchema.index({ userId: 1, nextDueDate: 1 });

// ─── Milestone ───────────────────────────────────────────
const MilestoneSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 0.01 },
    savedAmount: { type: Number, default: 0, min: 0 },
    targetDate: Date,
    monthlyTarget: Number,
    description: { type: String, trim: true },
    category: String,
    icon: { type: String, default: 'Target' },
    color: { type: String, default: '#8b5cf6' },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
  },
  base
);
MilestoneSchema.index({ userId: 1, status: 1 });

// ─── Milestone Contribution ───────────────────────────────
const ContributionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    milestoneId: { type: Schema.Types.ObjectId, ref: 'Milestone', required: true },
    amount: { type: Number, min: 0.01, required: true },
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true },
  },
  base
);
ContributionSchema.index({ userId: 1, milestoneId: 1, date: -1 });

// ─── Exports ─────────────────────────────────────────────
export const User = mongoose.model<IUser>('User', UserSchema);
export const Transaction = mongoose.model('Transaction', TransactionSchema);
export const Category = mongoose.model('Category', CategorySchema);
export const Budget = mongoose.model('Budget', BudgetSchema);
export const CreditCard = mongoose.model('CreditCard', CardSchema);
export const RecurringTransaction = mongoose.model('RecurringTransaction', RecurringSchema);
export const Milestone = mongoose.model('Milestone', MilestoneSchema);
export const MilestoneContribution = mongoose.model('MilestoneContribution', ContributionSchema);

// ─── Gold ──────────────────────────────────────────────────
const GoldTargetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    targetGrams: { type: Number, min: 0, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  base
);
GoldTargetSchema.index({ userId: 1 });

const GoldTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['buy', 'sell'], required: true },
    grams: { type: Number, min: 0, required: true },
    price: { type: Number, min: 0 },
    notes: { type: String, trim: true },
  },
  base
);
GoldTransactionSchema.index({ userId: 1, date: -1 });

export const GoldTarget = mongoose.model('GoldTarget', GoldTargetSchema);
export const GoldTransaction = mongoose.model('GoldTransaction', GoldTransactionSchema);
