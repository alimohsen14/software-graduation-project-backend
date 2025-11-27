/* eslint-disable */
import { Injectable, ForbiddenException } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AiService {
  private client: OpenAI;

  constructor(private prisma: PrismaService) {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // ✅ إرسال سؤال + حفظه
  async ask(
    message: string,
    lang: 'ar' | 'en',
    userId: number,
  ): Promise<{ answer: string; chatId: number; title: string }> {
    const title =
      (message || '').split(/\s+/).slice(0, 6).join(' ').trim() || 'New Chat';

    // ✅ إنشاء الشات
    const chat = await this.prisma.aiChat.create({
      data: {
        title,
        userId,
      },
    });

    // ✅ حفظ رسالة اليوزر
    await this.prisma.aiMessage.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: message,
      },
    });

    const systemPrompt = `You are a specialized AI assistant for the Palestine 3D project.
Your knowledge is strictly related to Palestine only: history, traditions,
food, cities, Nabulsi soap, culture, and landmarks.

Respond ONLY in the language provided: ${lang}.
If lang is 'ar' respond in Arabic, if 'en' respond in English.
Always put a watermelon emoji 🍉 at the beginning and at the end of the answer.
Do not answer anything unrelated to Palestine.`;

    // ✅ طلب من OpenAI
    const res = await this.client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.2,
      max_tokens: 800,
    } as any);

    const answer = (res?.choices?.[0]?.message?.content ?? '').trim();

    // ✅ حفظ رد الذكاء الاصطناعي
    await this.prisma.aiMessage.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: answer,
      },
    });

    return {
      answer,
      chatId: chat.id,
      title,
    };
  }

  // ✅ جلب كل الشاتات لليوزر
  async getAllChats(userId: number) {
    return this.prisma.aiChat.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });
  }

  // ✅ جلب رسائل شات معين
  async getChatMessages(chatId: number, userId: number) {
    const chat = await this.prisma.aiChat.findUnique({
      where: { id: chatId },
    });

    if (!chat || chat.userId !== userId) {
      throw new ForbiddenException('Not your chat');
    }

    return this.prisma.aiMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ✅ حذف الشات
  async deleteChat(chatId: number, userId: number) {
    const chat = await this.prisma.aiChat.findUnique({
      where: { id: chatId },
    });

    if (!chat || chat.userId !== userId) {
      throw new ForbiddenException('Not your chat');
    }

    await this.prisma.aiMessage.deleteMany({
      where: { chatId },
    });

    await this.prisma.aiChat.delete({
      where: { id: chatId },
    });

    return { message: 'Chat deleted successfully ✅', chatId };
  }
}
