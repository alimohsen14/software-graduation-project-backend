/* eslint-disable */
import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AiService {
  private client: OpenAI;

  constructor(private prisma: PrismaService) {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  private detectLanguage(text: string): 'ar' | 'en' {
    const arabicRegex = /[\u0600-\u06FF]/g;
    const matches = text.match(arabicRegex);
    const arabicCount = matches ? matches.length : 0;
    return arabicCount > text.length * 0.4 ? 'ar' : 'en';
  }

  async ask(
    message: string,
    lang: 'ar' | 'en',
    userId: number,
    chatId?: number,
  ): Promise<{ answer: string; chatId: number; title: string }> {
    let chat;

    if (chatId) {
      chat = await this.prisma.aiChat.findUnique({ where: { id: chatId } });
      if (!chat || chat.userId !== userId) chat = null;
    }

    if (!chat) {
      const title =
        (message || '').split(/\s+/).slice(0, 6).join(' ').trim() ||
        'New Chat';

      chat = await this.prisma.aiChat.create({
        data: { title, userId },
      });
    }

    await this.prisma.aiMessage.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: message,
      },
    });

    const userTextLang = this.detectLanguage(message);
    const replyLang = userTextLang || lang;

    const systemPrompt =
      replyLang === 'ar'
        ? `أنت مساعد ذكاء اصطناعي متخصص في فلسطين فقط.
أجب دائمًا باللغة العربية الفصحى.
يجب أن تبدأ وتنهي كل رد بإيموجي البطيخة 🍉.
لا تذكر أي مواضيع خارج فلسطين على الإطلاق.`
        : `You are an AI assistant specialized ONLY in Palestine.
Always answer in English.
Must begin and end every answer with a watermelon emoji 🍉.
Do not respond to anything unrelated to Palestine.`;

    const history = await this.prisma.aiMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const formattedHistory = history.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const res = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
      ],
      temperature: 0.2,
      max_tokens: 800,
    } as any);

    const answer = (res?.choices?.[0]?.message?.content ?? '').trim();

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
      title: chat.title,
    };
  }

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

    return { message: 'Chat deleted successfully', chatId };
  }
}
