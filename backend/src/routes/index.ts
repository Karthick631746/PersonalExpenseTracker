import { Router } from 'express';
import { Types } from 'mongoose';
import { auth, AuthRequest } from '../middleware/auth.js';
import {
  Transaction,
  Category,
  Budget,
  CreditCard,
  RecurringTransaction,
  Milestone,
  MilestoneContribution,
} from '../models/index.js';
import { Parser } from 'json2csv';

const r = Router();
r.use(auth);

// ═══════════════════════════════════════════════════════
// HELPER — parse date range from query params
// ═══════════════════════════════════════════════════════
function parseDateRange(query: any): { start: Date; end: Date } | null {
  if (query.start && query.end) {
    const start = new Date(query.start as string);
    const end = new Date(query.end as string);
    end.setHours(23, 59, 59, 999);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end };
  }

  const period = (query.period as string) || 'this_month';
  const now = new Date();

  if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'this_year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'last_year') {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'all') return null;

  // Default: this month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function prevPeriod(range: { start: Date; end: Date }): { start: Date; end: Date } {
  const diff = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - diff - 1),
    end: new Date(range.start.getTime() - 1),
  };
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

// ═══════════════════════════════════════════════════════
// TRANSACTIONS — CRUD with category & credit card
// ═══════════════════════════════════════════════════════
r.get('/transactions', async (req: AuthRequest, res) => {
  try {
    const uid = new Types.ObjectId(req.userId);
    const q: any = { userId: uid };
    const range = parseDateRange(req.query);
    if (range) q.date = { $gte: range.start, $lte: range.end };
    if (req.query.type) q.type = req.query.type;
    if (req.query.categoryId) q.categoryId = req.query.categoryId;
    if (req.query.search) {
      q.description = { $regex: String(req.query.search), $options: 'i' };
    }

    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Transaction.find(q)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name icon color type')
        .populate('creditCardId', 'cardName bank last4 color'),
      Transaction.countDocuments(q),
    ]);

    res.json({ data: items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

r.post('/transactions', async (req: AuthRequest, res) => {
  try {
    const uid = new Types.ObjectId(req.userId);
    const body = {
      ...req.body,
      userId: uid,
      amount: Number(req.body.amount),
      date: new Date(req.body.date),
    };

    if (!body.description) return res.status(400).json({ message: 'Description is required' });
    if (!body.amount || body.amount <= 0) return res.status(400).json({ message: 'Amount must be positive' });

    const tx = await Transaction.create(body);

    // Update credit card outstanding balance
    if (tx.creditCardId && (tx.type === 'expense' || tx.type === 'credit_card_payment')) {
      const delta =
        tx.type === 'expense' ? tx.amount : // charge increases outstanding
        tx.type === 'credit_card_payment' ? -tx.amount : // payment reduces outstanding
        0;
      await CreditCard.findOneAndUpdate(
        { _id: tx.creditCardId, userId: uid },
        { $inc: { outstandingBalance: delta } }
      );
    }

    const populated = await Transaction.findById(tx._id)
      .populate('categoryId', 'name icon color type')
      .populate('creditCardId', 'cardName bank last4 color');

    res.status(201).json(populated);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid data' });
  }
});

r.get('/transactions/:id', async (req: AuthRequest, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.userId })
      .populate('categoryId', 'name icon color type')
      .populate('creditCardId', 'cardName bank last4 color');
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    res.json(tx);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

r.put('/transactions/:id', async (req: AuthRequest, res) => {
  try {
    const uid = new Types.ObjectId(req.userId);
    const old = await Transaction.findOne({ _id: req.params.id, userId: uid });
    if (!old) return res.status(404).json({ message: 'Transaction not found' });

    // Reverse old credit card effect
    if (old.creditCardId) {
      const oldDelta =
        old.type === 'expense' ? -old.amount :
        old.type === 'credit_card_payment' ? old.amount : 0;
      if (oldDelta !== 0) {
        await CreditCard.findOneAndUpdate(
          { _id: old.creditCardId, userId: uid },
          { $inc: { outstandingBalance: oldDelta } }
        );
      }
    }

    const body = {
      ...req.body,
      amount: req.body.amount ? Number(req.body.amount) : old.amount,
      date: req.body.date ? new Date(req.body.date) : old.date,
    };

    const updated = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: uid },
      body,
      { new: true, runValidators: true }
    )
      .populate('categoryId', 'name icon color type')
      .populate('creditCardId', 'cardName bank last4 color');

    // Apply new credit card effect
    if (updated && updated.creditCardId) {
      const newDelta =
        updated.type === 'expense' ? updated.amount :
        updated.type === 'credit_card_payment' ? -updated.amount : 0;
      if (newDelta !== 0) {
        await CreditCard.findOneAndUpdate(
          { _id: updated.creditCardId, userId: uid },
          { $inc: { outstandingBalance: newDelta } }
        );
      }
    }

    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid data' });
  }
});

r.delete('/transactions/:id', async (req: AuthRequest, res) => {
  try {
    const uid = new Types.ObjectId(req.userId);
    const tx = await Transaction.findOneAndDelete({ _id: req.params.id, userId: uid });
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });

    // Reverse credit card effect
    if (tx.creditCardId) {
      const delta =
        tx.type === 'expense' ? -tx.amount :
        tx.type === 'credit_card_payment' ? tx.amount : 0;
      if (delta !== 0) {
        await CreditCard.findOneAndUpdate(
          { _id: tx.creditCardId, userId: uid },
          { $inc: { outstandingBalance: delta } }
        );
      }
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════
r.get('/categories', async (req: AuthRequest, res) => {
  try {
    const q: any = { userId: req.userId };
    if (req.query.type) q.type = req.query.type;
    const cats = await Category.find(q).sort({ isDefault: -1, name: 1 });
    res.json(cats);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

r.post('/categories', async (req: AuthRequest, res) => {
  try {
    const existing = await Category.findOne({
      userId: req.userId,
      name: req.body.name?.trim(),
      type: req.body.type,
    });
    if (existing) return res.status(409).json({ message: 'Category already exists' });
    const cat = await Category.create({ ...req.body, userId: req.userId });
    res.status(201).json(cat);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid data' });
  }
});

r.put('/categories/:id', async (req: AuthRequest, res) => {
  try {
    const cat = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid data' });
  }
});

r.delete('/categories/:id', async (req: AuthRequest, res) => {
  try {
    const cat = await Category.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════
// BUDGETS
// ═══════════════════════════════════════════════════════
async function getBudgetSpending(budgetId: string, userId: string, categoryId: any, startDate: Date, endDate: Date): Promise<number> {
  const agg = await Transaction.aggregate([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        type: 'expense',
        categoryId: new Types.ObjectId(categoryId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return agg[0]?.total || 0;
}

r.get('/budgets', async (req: AuthRequest, res) => {
  try {
    const budgets = await Budget.find({ userId: req.userId })
      .populate('categoryId', 'name icon color type')
      .sort({ startDate: -1 });

    const budgetsWithSpending = await Promise.all(
      budgets.map(async (b) => {
        const spent = await getBudgetSpending(
          String(b._id),
          req.userId!,
          b.categoryId,
          b.startDate,
          b.endDate
        );
        return { ...b.toObject(), spentAmount: spent };
      })
    );

    res.json(budgetsWithSpending);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

r.post('/budgets', async (req: AuthRequest, res) => {
  try {
    const body = {
      ...req.body,
      userId: req.userId,
      amount: Number(req.body.amount),
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
    };
    if (!body.name) return res.status(400).json({ message: 'Budget name is required' });
    if (!body.categoryId) return res.status(400).json({ message: 'Category is required' });
    if (body.endDate < body.startDate) return res.status(400).json({ message: 'End date must be after start date' });

    const b = await Budget.create(body);
    const populated = await Budget.findById(b._id).populate('categoryId', 'name icon color type');
    const spent = await getBudgetSpending(String(b._id), req.userId!, b.categoryId, b.startDate, b.endDate);
    res.status(201).json({ ...populated!.toObject(), spentAmount: spent });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid data' });
  }
});

r.put('/budgets/:id', async (req: AuthRequest, res) => {
  try {
    const body = {
      ...req.body,
      amount: req.body.amount ? Number(req.body.amount) : undefined,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    };
    if (body.startDate && body.endDate && body.endDate < body.startDate)
      return res.status(400).json({ message: 'End date must be after start date' });

    const b = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      body,
      { new: true, runValidators: true }
    ).populate('categoryId', 'name icon color type');

    if (!b) return res.status(404).json({ message: 'Budget not found' });
    const spent = await getBudgetSpending(String(b._id), req.userId!, b.categoryId, b.startDate, b.endDate);
    res.json({ ...b.toObject(), spentAmount: spent });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid data' });
  }
});

r.delete('/budgets/:id', async (req: AuthRequest, res) => {
  try {
    const b = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!b) return res.status(404).json({ message: 'Budget not found' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════
// CREDIT CARDS
// ═══════════════════════════════════════════════════════
r.get('/credit-cards', async (req: AuthRequest, res) => {
  try {
    const cards = await CreditCard.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(cards);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

r.post('/credit-cards', async (req: AuthRequest, res) => {
  try {
    const body = {
      ...req.body,
      userId: req.userId,
      creditLimit: Number(req.body.creditLimit) || 0,
      outstandingBalance: Number(req.body.outstandingBalance) || 0,
      billingDate: req.body.billingDate ? Number(req.body.billingDate) : undefined,
      dueDate: req.body.dueDate ? Number(req.body.dueDate) : undefined,
      interestRate: req.body.interestRate ? Number(req.body.interestRate) : undefined,
    };
    if (!body.cardName) return res.status(400).json({ message: 'Card name is required' });
    const card = await CreditCard.create(body);
    res.status(201).json(card);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid data' });
  }
});

r.put('/credit-cards/:id', async (req: AuthRequest, res) => {
  try {
    const body = {
      ...req.body,
      creditLimit: req.body.creditLimit !== undefined ? Number(req.body.creditLimit) : undefined,
      outstandingBalance: req.body.outstandingBalance !== undefined ? Number(req.body.outstandingBalance) : undefined,
    };
    const card = await CreditCard.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      body,
      { new: true, runValidators: true }
    );
    if (!card) return res.status(404).json({ message: 'Card not found' });
    res.json(card);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid data' });
  }
});

r.delete('/credit-cards/:id', async (req: AuthRequest, res) => {
  try {
    const card = await CreditCard.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!card) return res.status(404).json({ message: 'Card not found' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════
// RECURRING TRANSACTIONS
// ═══════════════════════════════════════════════════════
r.get('/recurring', async (req: AuthRequest, res) => {
  try {
    const items = await RecurringTransaction.find({ userId: req.userId })
      .populate('categoryId', 'name icon color type')
      .sort({ nextDueDate: 1 });
    res.json(items);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

r.post('/recurring', async (req: AuthRequest, res) => {
  try {
    const item = await RecurringTransaction.create({ ...req.body, userId: req.userId });
    res.status(201).json(item);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid data' });
  }
});

r.put('/recurring/:id', async (req: AuthRequest, res) => {
  try {
    const item = await RecurringTransaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid data' });
  }
});

r.delete('/recurring/:id', async (req: AuthRequest, res) => {
  try {
    const item = await RecurringTransaction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════
// MILESTONES
// ═══════════════════════════════════════════════════════
r.get('/milestones', async (req: AuthRequest, res) => {
  try {
    const items = await Milestone.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(items);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

r.post('/milestones', async (req: AuthRequest, res) => {
  try {
    const body = {
      ...req.body,
      userId: req.userId,
      targetAmount: Number(req.body.targetAmount),
      savedAmount: Number(req.body.savedAmount) || 0,
    };
    if (!body.name) return res.status(400).json({ message: 'Milestone name is required' });
    const m = await Milestone.create(body);
    res.status(201).json(m);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid data' });
  }
});

r.put('/milestones/:id', async (req: AuthRequest, res) => {
  try {
    const body = {
      ...req.body,
      targetAmount: req.body.targetAmount ? Number(req.body.targetAmount) : undefined,
      savedAmount: req.body.savedAmount !== undefined ? Number(req.body.savedAmount) : undefined,
    };
    const m = await Milestone.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      body,
      { new: true, runValidators: true }
    );
    if (!m) return res.status(404).json({ message: 'Milestone not found' });
    res.json(m);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid data' });
  }
});

r.delete('/milestones/:id', async (req: AuthRequest, res) => {
  try {
    const m = await Milestone.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!m) return res.status(404).json({ message: 'Milestone not found' });
    // Also delete contributions
    await MilestoneContribution.deleteMany({ milestoneId: req.params.id, userId: req.userId });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Milestone contributions
r.post('/milestones/:id/contributions', async (req: AuthRequest, res) => {
  try {
    const m = await Milestone.findOne({ _id: req.params.id, userId: req.userId });
    if (!m) return res.status(404).json({ message: 'Milestone not found' });

    const c = await MilestoneContribution.create({
      userId: req.userId,
      milestoneId: m._id,
      amount: Number(req.body.amount),
      date: req.body.date ? new Date(req.body.date) : new Date(),
      note: req.body.note,
    });

    // Recalculate savedAmount from all contributions
    const agg = await MilestoneContribution.aggregate([
      { $match: { milestoneId: m._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalSaved = Math.min(m.targetAmount, Math.max(0, agg[0]?.total || 0));
    m.savedAmount = totalSaved;
    if (m.savedAmount >= m.targetAmount) m.status = 'completed';
    else m.status = 'active';
    await m.save();

    res.status(201).json({ contribution: c, milestone: m });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid contribution' });
  }
});

r.get('/milestones/:id/contributions', async (req: AuthRequest, res) => {
  try {
    const items = await MilestoneContribution.find({
      userId: req.userId,
      milestoneId: req.params.id,
    }).sort({ date: -1 });
    res.json(items);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

r.delete('/milestones/:id/contributions/:cid', async (req: AuthRequest, res) => {
  try {
    const c = await MilestoneContribution.findOneAndDelete({
      _id: req.params.cid,
      userId: req.userId,
      milestoneId: req.params.id,
    });
    if (!c) return res.status(404).json({ message: 'Contribution not found' });

    const m = await Milestone.findOne({ _id: req.params.id, userId: req.userId });
    if (m) {
      const agg = await MilestoneContribution.aggregate([
        { $match: { milestoneId: m._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      m.savedAmount = Math.max(0, agg[0]?.total || 0);
      m.status = m.savedAmount >= m.targetAmount ? 'completed' : 'active';
      await m.save();
    }

    res.json({ ok: true, milestone: m });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════
r.get('/analytics/summary', async (req: AuthRequest, res) => {
  try {
    const uid = new Types.ObjectId(req.userId);
    const range = parseDateRange(req.query);
    const dateFilter = range ? { $gte: range.start, $lte: range.end } : undefined;
    const prevRange = range ? prevPeriod(range) : null;

    const matchBase = (type: string, dr?: { start: Date; end: Date }) => ({
      userId: uid,
      type,
      ...(dr ? { date: { $gte: dr.start, $lte: dr.end } } : {}),
    });

    const [
      incomeAgg,
      expenseAgg,
      prevIncomeAgg,
      prevExpenseAgg,
      ccAgg,
      milestonesAgg,
      budgets,
      recentTx,
    ] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: uid, type: 'income', ...(dateFilter ? { date: dateFilter } : {}) } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { userId: uid, type: { $in: ['expense', 'credit_card_payment'] }, ...(dateFilter ? { date: dateFilter } : {}) } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      prevRange
        ? Transaction.aggregate([
            { $match: { userId: uid, type: 'income', date: { $gte: prevRange.start, $lte: prevRange.end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ])
        : Promise.resolve([]),
      prevRange
        ? Transaction.aggregate([
            { $match: { userId: uid, type: { $in: ['expense', 'credit_card_payment'] }, date: { $gte: prevRange.start, $lte: prevRange.end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ])
        : Promise.resolve([]),
      CreditCard.aggregate([
        { $match: { userId: uid } },
        { $group: { _id: null, totalDebt: { $sum: '$outstandingBalance' }, limit: { $sum: '$creditLimit' } } },
      ]),
      Milestone.aggregate([
        { $match: { userId: uid } },
        { $group: { _id: null, target: { $sum: '$targetAmount' }, saved: { $sum: '$savedAmount' } } },
      ]),
      Budget.find({ userId: uid }).populate('categoryId', 'name icon color'),
      Transaction.find({ userId: uid })
        .sort({ date: -1, createdAt: -1 })
        .limit(5)
        .populate('categoryId', 'name icon color type')
        .populate('creditCardId', 'cardName bank last4'),
    ]);

    const income = incomeAgg[0]?.total || 0;
    const expense = expenseAgg[0]?.total || 0;
    const prevIncome = prevIncomeAgg[0]?.total || 0;
    const prevExpense = prevExpenseAgg[0]?.total || 0;

    // Budget spending
    const budgetSummary = await Promise.all(
      budgets.map(async (b) => {
        const spent = await getBudgetSpending(String(b._id), req.userId!, b.categoryId, b.startDate, b.endDate);
        return { ...b.toObject(), spentAmount: spent };
      })
    );
    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const totalBudgetSpent = budgetSummary.reduce((s, b) => s + b.spentAmount, 0);

    res.json({
      income,
      expense,
      balance: income - expense,
      savings: income - expense,
      savingsRate: income > 0 ? Math.round(((income - expense) / income) * 1000) / 10 : 0,
      prevIncome,
      prevExpense,
      incomePct: pctChange(income, prevIncome),
      expensePct: pctChange(expense, prevExpense),
      creditCards: ccAgg[0] || { totalDebt: 0, limit: 0 },
      milestones: milestonesAgg[0] || { target: 0, saved: 0 },
      budgetCount: budgets.length,
      totalBudget,
      totalBudgetSpent,
      totalBudgetRemaining: Math.max(0, totalBudget - totalBudgetSpent),
      recentTransactions: recentTx,
      period: req.query.period || 'this_month',
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

r.get('/analytics/categories', async (req: AuthRequest, res) => {
  try {
    const uid = new Types.ObjectId(req.userId);
    const range = parseDateRange(req.query);
    const dateFilter = range ? { $gte: range.start, $lte: range.end } : undefined;

    const result = await Transaction.aggregate([
      {
        $match: {
          userId: uid,
          type: { $in: ['expense', 'credit_card_payment'] },
          ...(dateFilter ? { date: dateFilter } : {}),
        },
      },
      { $group: { _id: '$categoryId', value: { $sum: '$amount' } } },
      { $sort: { value: -1 } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          value: 1,
          name: { $ifNull: ['$category.name', 'Uncategorized'] },
          icon: { $ifNull: ['$category.icon', 'Circle'] },
          color: { $ifNull: ['$category.color', '#6b7280'] },
        },
      },
    ]);

    res.json(result);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

r.get('/analytics/monthly-trend', async (req: AuthRequest, res) => {
  try {
    const uid = new Types.ObjectId(req.userId);
    const months = Number(req.query.months) || 6;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const result = await Transaction.aggregate([
      {
        $match: {
          userId: uid,
          date: { $gte: start },
          type: { $in: ['income', 'expense', 'credit_card_payment'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: {
              $cond: [{ $eq: ['$type', 'income'] }, 'income', 'expense'],
            },
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Build month-keyed map
    const monthMap: Record<string, { month: string; income: number; expense: number }> = {};
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      monthMap[key] = { month: label, income: 0, expense: 0 };
    }

    for (const row of result) {
      const key = `${row._id.year}-${String(row._id.month).padStart(2, '0')}`;
      if (monthMap[key]) {
        monthMap[key][row._id.type as 'income' | 'expense'] = row.total;
      }
    }

    res.json(Object.values(monthMap));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════
r.get('/export/transactions', async (req: AuthRequest, res) => {
  try {
    const rows = await Transaction.find({ userId: req.userId })
      .populate('categoryId', 'name')
      .sort({ date: -1 })
      .lean();

    const data = rows.map((t: any) => ({
      date: new Date(t.date).toLocaleDateString('en-IN'),
      description: t.description,
      type: t.type,
      amount: t.amount,
      category: t.categoryId?.name || '',
      paymentMethod: t.paymentMethod,
      notes: t.notes || '',
    }));

    const csv = new Parser({ fields: ['date', 'description', 'type', 'amount', 'category', 'paymentMethod', 'notes'] }).parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment('transactions.csv');
    res.send(csv);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default r;
