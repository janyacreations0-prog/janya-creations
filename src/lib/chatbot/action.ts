'use server';

import { createClient } from '@/lib/supabase/server';
import { FAQS } from './faq-data';
import { searchCatalog } from './catalog-search';
import type { ChatResponse } from './types';

const SUGGESTIONS = [
  'Show me earrings under ₹1000',
  'Do you have gold plated chains?',
  'Which necklaces do you have?',
  'Where is my order?',
  'What is your shipping policy?',
];

function isGreeting(q: string) {
  return /^(hi|hello|hey|namaste)\b/.test(q);
}

function isThanks(q: string) {
  return /thank|thanks|great|awesome|perfect/.test(q);
}

function isHelp(q: string) {
  return /\bhelp\b|\bwhat can you do\b/.test(q);
}

function isOrderIntent(q: string) {
  return (
    /order|track|status|shipped|delivered|package/.test(q) &&
    !/order (a|the)? ?product|place an order/.test(q)
  );
}

async function answerOrder(q: string): Promise<ChatResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      text: 'Please sign in to check your order. Your order details are private to your account.',
      quickReplies: ['What can you help me with?'],
    };
  }

  const orderNumber = (q.match(/(JC-\d{8}-\d{4})/i) || [])[1]?.toUpperCase();

  let query = supabase
    .from('orders')
    .select('order_number, total_amount, status, payment_status, created_at')
    .eq('user_id', user.id);
  if (orderNumber) query = query.eq('order_number', orderNumber);
  const { data: orders } = await query.order('created_at', { ascending: false }).limit(1);

  if (!orders || orders.length === 0) {
    return {
      text: orderNumber
        ? `I couldn't find order ${orderNumber} on your account. Double-check the order number or contact support.`
        : "I couldn't find any orders on your account yet.",
      quickReplies: ['Show me earrings under ₹1000'],
    };
  }

  const o = orders[0];
  const statusLabel = (o.status || 'pending').replace(/_/g, ' ');
  return {
    text: `Your order ${o.order_number} is currently "${statusLabel}" with payment ${o.payment_status}. Total: ₹${Number(
      o.total_amount
    ).toLocaleString()}.`,
    quickReplies: ['What is your refund policy?', 'Show me gold plated chains'],
  };
}

function answerFaq(q: string): ChatResponse | null {
  for (const faq of FAQS) {
    if (faq.keywords.some((k) => q.includes(k))) {
      return {
        text: faq.answer,
        ...(faq.link ? { quickReplies: [faq.link.label] } : {}),
        products: undefined,
      };
    }
  }
  return null;
}

function findFaqLink(label: string): string | undefined {
  return FAQS.find((f) => f.link?.label === label)?.link?.href;
}

export async function chatResponse(message: string): Promise<ChatResponse> {
  const text = String(message || '').trim();
  const q = text.toLowerCase();

  try {
    if (!q) {
      return {
        text: "Hi! I'm the Janya Creations assistant. I can help you find products, check your order, or answer store questions.",
        quickReplies: SUGGESTIONS,
      };
    }
    if (isGreeting(q)) {
      return {
        text: 'Hello! Welcome to Janya Creations. How can I help you today?',
        quickReplies: SUGGESTIONS,
      };
    }
    if (isThanks(q)) {
      return { text: "You're welcome! Is there anything else I can help you with?", quickReplies: SUGGESTIONS };
    }
    if (isHelp(q)) {
      return {
        text: 'I can help you discover products (e.g. “earrings under ₹1000”), answer store questions (shipping, returns, payments), and check your order status if you are signed in.',
        quickReplies: SUGGESTIONS,
      };
    }

    // FAQ link follow-ups (quick replies like "Shipping Policy").
    const faqLink = findFaqLink(text);
    if (faqLink) {
      return {
        text: `You can read more here: ${faqLink}`,
        quickReplies: ['Show me bangles', 'What is your refund policy?'],
      };
    }

    if (isOrderIntent(q)) {
      const order = await answerOrder(q);
      if (order) return order;
    }

    const faq = answerFaq(q);
    if (faq) return faq;

    const result = await searchCatalog(q);
    if (result.products.length > 0) {
      return { text: result.note, products: result.products, quickReplies: ['Show me necklaces under ₹1500', 'What is your shipping policy?'] };
    }
    if (result.matched) {
      return { text: result.note, quickReplies: SUGGESTIONS };
    }

    return {
      text: "I'm not sure I understood that. Try asking about products (e.g. “bangles under ₹500”), or about shipping, returns or payments.",
      quickReplies: SUGGESTIONS,
    };
  } catch (e) {
    console.error('[chatbot] engine error:', e);
    return {
      text: 'Sorry, something went wrong. Please try again in a moment.',
      quickReplies: SUGGESTIONS,
    };
  }
}
