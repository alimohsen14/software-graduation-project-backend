/* eslint-disable */
import { Injectable, ForbiddenException } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from 'src/prisma/prisma.service';

enum MarketIntent {
  BEST_SELLING_PRODUCT,
  TOP_RATED_STORE,
  NONE,
}

@Injectable()
export class AiService {
  private client: OpenAI;

  constructor(private prisma: PrismaService) {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // =========================
  // HELPER METHODS
  // =========================
  private detectLanguage(text: string): 'ar' | 'en' | 'fr' {
    // 1. Arabic Detection
    const arabicRegex = /[\u0600-\u06FF]/;
    if (arabicRegex.test(text)) return 'ar';

    // 2. French Detection (Simple heuristics)
    // specific accented chars or common words
    const frenchRegex = /[àâäéèêëîïôöùûüç]/i;
    const frenchWords = /\b(le|la|les|un|une|des|et|ou|je|tu|il|elle|nous|vous|ils|elles|produit|magasin|vente|achat|prix)\b/i;

    if (frenchRegex.test(text) || frenchWords.test(text)) return 'fr';

    // 3. Default to English
    return 'en';
  }

  private detectMarketIntent(message: string): MarketIntent {
    // BEST_SELLING_PRODUCT
    const bestSellingPatterns = [
      // Arabic
      /أكثر\s*منتج\s*مبيع/i,
      /الاكثر\s*مبيع/i,
      /أكثر\s*مبيعات/i,
      // English
      /best\s*selling\s*product/i,
      /most\s*sold\s*product/i,
      // French
      /produit\s*le\s*plus\s*vendu/i,
      /meilleures\s*ventes/i,
    ];

    if (bestSellingPatterns.some((r) => r.test(message))) {
      return MarketIntent.BEST_SELLING_PRODUCT;
    }

    // TOP_RATED_STORE
    const topRatedPatterns = [
      // Arabic
      /أعلى\s*سوق\s*تقييماً/i,
      /أعلى\s*متجر\s*تقييماً/i,
      /أفضل\s*سوق\s*حسب\s*التقييم/i,
      // English
      /top\s*rated\s*market/i,
      /top\s*rated\s*store/i,
      /best\s*rated\s*store/i,
      // French
      /marché\s*le\s*mieux\s*noté/i,
      /meilleur\s*magasin\s*noté/i,
    ];

    if (topRatedPatterns.some((r) => r.test(message))) {
      return MarketIntent.TOP_RATED_STORE;
    }

    return MarketIntent.NONE;
  }

  // =========================
  // MAIN ASK METHOD
  // =========================
  async ask(
    message: string,
    reqLang: 'ar' | 'en' | 'fr' = 'en', // Default from controller might differ
    userId: number,
    chatId?: number,
  ): Promise<{ answer: string; chatId: number; title: string }> {
    let chat;

    // 1. Load or Create Chat
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

    // 2. Save User Message
    await this.prisma.aiMessage.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: message,
      },
    });

    // Detect language from message, fallback to requested lang
    const detected = this.detectLanguage(message);
    const replyLang = detected; // Prioritize message language

    // 3. CHECK INTENT
    const intent = this.detectMarketIntent(message);

    if (intent !== MarketIntent.NONE) {
      let answer = '';

      if (intent === MarketIntent.BEST_SELLING_PRODUCT) {
        answer = await this.handleBestSellingProducts(replyLang);
      } else if (intent === MarketIntent.TOP_RATED_STORE) {
        answer = await this.handleTopRatedStores(replyLang);
      }

      // Save Assistant Message
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

    // === HERITAGE ROUTE (OpenAI) ===
    let systemPrompt = '';

    if (replyLang === 'ar') {
      systemPrompt = `أنت مساعد ذكاء اصطناعي متخصص في فلسطين فقط.
أجب دائمًا باللغة العربية الفصحى.
يجب أن تبدأ وتنهي كل رد بإيموجي البطيخة 🍉.
لا تذكر أي مواضيع خارج فلسطين على الإطلاق.
لا تتحدث عن المنتجات أو المتاجر أو البيع والشراء.`;
    } else if (replyLang === 'fr') {
      systemPrompt = `Vous êtes un assistant IA spécialisé UNIQUEMENT sur la Palestine.
Répondez toujours en Français.
Vous devez commencer et finir chaque réponse par un émoji pastèque 🍉.
Ne répondez à rien qui ne soit pas lié à la Palestine.
Ne parlez pas de produits, de magasins, d'achats ou de prix.`;
    } else {
      systemPrompt = `You are an AI assistant specialized ONLY in Palestine.
Always answer in English.
Must begin and end every answer with a watermelon emoji 🍉.
Do not respond to anything unrelated to Palestine.
Do not cover commercial topics like products, stores, or prices.`;
    }

    const history = await this.prisma.aiMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const formattedHistory = history.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    try {
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
    } catch (error) {
      console.error('OpenAI Error:', error);
      let fallback = '';
      if (replyLang === 'ar') fallback = 'عذراً، أواجه ضغطاً كبيراً حالياً. يرجى المحاولة لاحقاً. 🍉';
      else if (replyLang === 'fr') fallback = 'Désolé, je subis un fort trafic. Veuillez réessayer plus tard. 🍉';
      else fallback = 'Sorry, I am experiencing high traffic. Please try again later. 🍉';

      return {
        answer: fallback,
        chatId: chat.id,
        title: chat.title,
      };
    }
  }

  // =========================
  // MARKETPLACE HANDLERS
  // =========================

  private async handleBestSellingProducts(lang: 'ar' | 'en' | 'fr'): Promise<string> {
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    if (grouped.length === 0) {
      if (lang === 'ar') return 'لا يوجد بيانات مبيعات كافية حالياً.';
      if (lang === 'fr') return "Il n'y a pas encore assez de données de vente.";
      return 'No sales data available yet.';
    }

    const productIds = grouped.map((g) => g.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { name: true },
    });

    if (products.length === 0) {
      if (lang === 'ar') return 'لا يوجد بيانات مبيعات كافية حالياً.';
      if (lang === 'fr') return "Il n'y a pas encore assez de données de vente.";
      return 'No sales data available yet.';
    }

    const list = products.map((p) => `- ${p.name}`).join('\n');

    if (lang === 'ar') return `المنتجات الأكثر مبيعاً لدينا هي:\n${list}`;
    if (lang === 'fr') return `Voici nos produits les plus vendus :\n${list}`;
    return `Our best-selling products are:\n${list}`;
  }

  private async handleTopRatedStores(lang: 'ar' | 'en' | 'fr'): Promise<string> {
    // Note: Since Store table does not have a rating column, we aggregate from Product ratings.
    const grouped = await this.prisma.product.groupBy({
      by: ['storeId'],
      _avg: { rating: true },
      orderBy: { _avg: { rating: 'desc' } },
      take: 5,
    });

    if (grouped.length === 0) {
      if (lang === 'ar') return 'لا يوجد بيانات تقييم كافية للمتاجر حالياً.';
      if (lang === 'fr') return "Il n'y a pas encore assez de données d'évaluation pour les magasins.";
      return 'No store rating data available yet.';
    }

    const storeIds = grouped.map((g) => g.storeId);
    const stores = await this.prisma.store.findMany({
      where: { id: { in: storeIds }, isActive: true },
      select: { name: true },
    });

    if (stores.length === 0) {
      if (lang === 'ar') return 'لا يوجد بيانات تقييم كافية للمتاجر حالياً.';
      if (lang === 'fr') return "Il n'y a pas encore assez de données d'évaluation pour les magasins.";
      return 'No store rating data available yet.';
    }

    const list = stores.map((s) => `- ${s.name}`).join('\n');

    if (lang === 'ar') return `أفضل المتاجر تقييماً لدينا هي:\n${list}`;
    if (lang === 'fr') return `Voici nos magasins les mieux notés :\n${list}`;
    return `Our top-rated stores are:\n${list}`;
  }

  // =========================
  // CHAT MANAGEMENT
  // =========================
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
