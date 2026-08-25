export interface ChatProductResult {
  id: string;
  title: string;
  price: number;
  image?: string | null;
}

export interface ChatResponse {
  text: string;
  products?: ChatProductResult[];
  quickReplies?: string[];
}

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}
