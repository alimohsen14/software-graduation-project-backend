/* eslint-disable */
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AiService {
  private client: OpenAI;

  constructor(private prisma: PrismaService) {
    // تأكد إنك حاطط ال API KEY بملف .env
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // ✅ عدلنا التوقيع ليستقبل chatId كـ Optional
  async ask(
    message: string,
    lang: 'ar' | 'en',
    userId: number,
    chatId?: number, // <--- إضافة
  ): Promise<{ answer: string; chatId: number; title: string }> {
    let chat;

    // 1️⃣ السيناريو الأول: المستخدم بعت chatId (يعني بكمل محادثة)
    if (chatId) {
      chat = await this.prisma.aiChat.findUnique({
        where: { id: chatId },
      });

      // أمان: نتأكد إنه الشات موجود وإنه ملك لليوزر هاد
      if (!chat || chat.userId !== userId) {
        // إذا الشات مش موجود أو مش اله، بنعتبره شات جديد وبنكمل
        // أو ممكن ترمي Error حسب شو بتفضل، أنا بفضل ننشئ جديد عشان ما يضرب النظام
        chat = null;
      }
    }

    // 2️⃣ السيناريو الثاني: فش chatId أو الشات غير موجود -> بنعمل Create
    if (!chat) {
      const title =
        (message || '').split(/\s+/).slice(0, 6).join(' ').trim() || 'New Chat';

      chat = await this.prisma.aiChat.create({
        data: {
          title,
          userId,
        },
      });
    }

    // لهون تمام: صار معنا chat object (يا قديم يا جديد)

    // ✅ حفظ رسالة اليوزر بنفس الـ chatId
    await this.prisma.aiMessage.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: message,
      },
    });

    // سياق النظام
    const systemPrompt = `You are a specialized AI assistant for the Palestine 3D project.
Your knowledge is strictly related to Palestine only: history, traditions,
food, cities, Nabulsi soap, culture, and landmarks.

Respond ONLY in the language provided: ${lang}.
If lang is 'ar' respond in Arabic, if 'en' respond in English.
Always put a watermelon emoji 🍉 at the beginning and at the end of the answer.
Do not answer anything unrelated to Palestine.`;

    // جلب الرسائل السابقة عشان الـ AI يفهم سياق المحادثة (اختياري بس بنصحك فيه بقوة)
    // رح اجيب آخر 6 رسائل عشان ما نصرف توكنز كثير
    const history = await this.prisma.aiMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    // ترتيب الرسائل من الأقدم للأحدث عشان GPT يفهم
    const formattedHistory = history.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // ✅ طلب من OpenAI
    const res = await this.client.chat.completions.create({
      model: 'gpt-4o-mini', // تأكد من اسم الموديل (gpt-4o-mini أو gpt-3.5-turbo)
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedHistory, // نبعت التاريخ عشان يفهم "بناء على كلامك السابق"
        // الملاحظة: الرسالة الحالية message موجودة ضمن الـ history لأنا خزنناها فوق
        // بس انتبه: create فوق ممكن ما يكون لحق يرجع ب ال findMany
        // فالأضمن نبعت message بآخر المصفوفة يدوياً لو ما ظهرت بالهيتسوري، بس بما إنا عملنا await create المفروض تمام
      ],
      temperature: 0.2,
      max_tokens: 800,
    } as any);

    const answer = (res?.choices?.[0]?.message?.content ?? '').trim();

    // ✅ حفظ رد الذكاء الاصطناعي بنفس الـ chatId
    await this.prisma.aiMessage.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: answer,
      },
    });

    return {
      answer,
      chatId: chat.id, // بنرجع ال ID سواء كان جديد أو قديم
      title: chat.title,
    };
  }

  // ... باقي الدوال (getAllChats, etc) بتضل زي ما هي
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

    return { message: 'Chat deleted successfully ✅', chatId };
  }
}
