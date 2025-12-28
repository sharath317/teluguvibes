import { NextResponse } from 'next/server';

interface GoldAPIResponse {
  price: number;
  price_gram_24k: number;
  price_gram_22k: number;
  price_gram_21k: number;
  price_gram_18k: number;
}

// Cache gold prices for 30 minutes
let cachedPrices: {
  gold_24k: number;
  gold_22k: number;
  silver: number;
  city: string;
  updated_at: string;
} | null = null;
let cacheTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function GET() {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedPrices && (now - cacheTime) < CACHE_DURATION) {
    return NextResponse.json(cachedPrices);
  }

  try {
    // If no API key, return mock data for development
    if (!process.env.GOLD_API_KEY) {
      const mockPrices = {
        gold_24k: 7650,
        gold_22k: 7012,
        silver: 95,
        city: 'Hyderabad',
        updated_at: new Date().toISOString(),
      };
      return NextResponse.json(mockPrices);
    }

    // Fetch gold price from GoldAPI
    const goldRes = await fetch('https://www.goldapi.io/api/XAU/INR', {
      headers: {
        'x-access-token': process.env.GOLD_API_KEY,
      },
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!goldRes.ok) {
      throw new Error('Failed to fetch gold prices');
    }

    const goldData: GoldAPIResponse = await goldRes.json();

    // Fetch silver price
    const silverRes = await fetch('https://www.goldapi.io/api/XAG/INR', {
      headers: {
        'x-access-token': process.env.GOLD_API_KEY,
      },
      next: { revalidate: 1800 },
    });

    let silverPrice = 95; // Default
    if (silverRes.ok) {
      const silverData = await silverRes.json();
      silverPrice = Math.round(silverData.price_gram_24k || 95);
    }

    cachedPrices = {
      gold_24k: Math.round(goldData.price_gram_24k),
      gold_22k: Math.round(goldData.price_gram_22k),
      silver: silverPrice,
      city: 'Hyderabad',
      updated_at: new Date().toISOString(),
    };
    cacheTime = now;

    return NextResponse.json(cachedPrices);
  } catch (error) {
    console.error('Gold API error:', error);

    // Return last cached value or mock data on error
    if (cachedPrices) {
      return NextResponse.json(cachedPrices);
    }

    return NextResponse.json({
      gold_24k: 7650,
      gold_22k: 7012,
      silver: 95,
      city: 'Hyderabad',
      updated_at: new Date().toISOString(),
      error: 'Using fallback prices',
    });
  }
}
