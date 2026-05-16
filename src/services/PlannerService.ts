import { db, Goal, Budget } from '../db';

export const PlannerService = {
  async addGoal(goal: Omit<Goal, 'id' | 'currentAmount'>): Promise<number> {
    return await db.goals.add({
      ...goal,
      currentAmount: 0
    });
  },

  async updateGoal(id: number, changes: Partial<Goal>): Promise<number> {
    return await db.goals.update(id, changes);
  },

  async deleteGoal(id: number): Promise<void> {
    await db.goals.delete(id);
  },

  async addFunds(goalId: number, currentAmount: number, amountToAdd: number): Promise<number> {
    return await db.goals.update(goalId, {
      currentAmount: currentAmount + amountToAdd
    });
  },

  async upsertBudget(budget: Omit<Budget, 'id'>, existingId?: number): Promise<number> {
    if (existingId) {
      await db.budgets.update(existingId, { amount: budget.amount });
      return existingId;
    } else {
      return await db.budgets.add(budget);
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
