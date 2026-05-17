import { db, Goal, Budget } from '../db';
import { GoalSchema, BudgetSchema } from '../models/schemas';

export const PlannerService = {
  async addGoal(goal: Omit<Goal, 'id' | 'currentAmount'>): Promise<number> {
    const validated = GoalSchema.parse({
      ...goal,
      currentAmount: 0
    });
    return await db.goals.add(validated as Goal);
  },

  async updateGoal(id: number, changes: Partial<Goal>): Promise<number> {
    // For updates, we can use partial schema validation if needed, 
    // but here we just pass it to Dexie after checking existence
    const goal = await db.goals.get(id);
    if (!goal) throw new Error('Goal not found');
    return await db.goals.update(id, changes);
  },

  async deleteGoal(id: number): Promise<void> {
    const goal = await db.goals.get(id);
    if (!goal) throw new Error('Goal not found');
    await db.goals.delete(id);
  },

  async addFunds(goalId: number, currentAmount: number, amountToAdd: number): Promise<number> {
    if (!Number.isFinite(amountToAdd) || amountToAdd <= 0) {
      throw new Error('Invalid amount to add');
    }
    const goal = await db.goals.get(goalId);
    if (!goal) throw new Error('Goal not found');
    
    return await db.goals.update(goalId, {
      currentAmount: currentAmount + amountToAdd
    });
  },

  async upsertBudget(budget: Omit<Budget, 'id'>, existingId?: number): Promise<number> {
    const validated = BudgetSchema.parse(budget);
    if (existingId) {
      await db.budgets.update(existingId, { amount: validated.amount });
      return existingId;
    } else {
      return await db.budgets.add(validated as Budget);
    }
  },

  async getGoalsByContext(context: 'personal' | 'business') {
    return await db.goals.where('context').equals(context).toArray();
  },

  async getAllGoals() {
    return await db.goals.toArray();
  },

  async getBudgets(context?: 'personal' | 'business', month?: string) {
    if (month && context) {
      return await db.budgets.where({ month, context }).toArray();
    }
    if (context) {
      return await db.budgets.where('context').equals(context).toArray();
    }
    return await db.budgets.toArray();
  }
};
