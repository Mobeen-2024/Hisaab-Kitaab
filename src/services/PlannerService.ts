import { db, Goal, Budget } from '../db';

export class PlannerService {
  static async addGoal(goal: Omit<Goal, 'id' | 'currentAmount'>): Promise<number> {
    return await db.goals.add({
      ...goal,
      currentAmount: 0
    });
  }

  static async updateGoal(id: number, changes: Partial<Goal>): Promise<number> {
    return await db.goals.update(id, changes);
  }

  static async deleteGoal(id: number): Promise<void> {
    await db.goals.delete(id);
  }

  static async addFunds(goalId: number, currentAmount: number, amountToAdd: number): Promise<number> {
    return await db.goals.update(goalId, {
      currentAmount: currentAmount + amountToAdd
    });
  }

  static async upsertBudget(budget: Omit<Budget, 'id'>, existingId?: number): Promise<number> {
    if (existingId) {
      await db.budgets.update(existingId, { amount: budget.amount });
      return existingId;
    } else {
      return await db.budgets.add(budget);
    }
  }
}
