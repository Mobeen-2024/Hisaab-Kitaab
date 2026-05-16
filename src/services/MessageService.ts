import { db } from '../db';

export const MessageService = {
  async add(chatId: string, sender: 'user' | 'ai' | 'system', content: string) {
    return await db.messages.add({
      chatId,
      sender,
      content,
      timestamp: new Date().toISOString()
    });
  },

  async clearChat(chatId: string) {
    const ids = await db.messages.where('chatId').equals(chatId).primaryKeys();
    if (ids.length > 0) {
      await db.messages.bulkDelete(ids);
    }
  },

  async getAllByChatId(chatId: string) {
    return await db.messages.where('chatId').equals(chatId).toArray();
  }
};
