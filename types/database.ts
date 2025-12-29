export type Category = 'gossip' | 'sports' | 'politics' | 'entertainment' | 'trending';
export type PostStatus = 'draft' | 'published';

export interface Post {
  id: string;
  title: string;
  slug: string;
  telugu_body: string;
  image_urls: string[];
  category: Category;
  status: PostStatus;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface GoldPrices {
  gold_24k: number;
  gold_22k: number;
  silver: number;
  city: string;
  updated_at: string;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  city: string;
  humidity: number;
}

export interface TrendingTopic {
  title: string;
  traffic: string;
  url: string;
}

