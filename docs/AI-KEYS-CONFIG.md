# AI API Keys Configuration

Copy these to your `.env.local` file for full key rotation support.

## Quick Setup

Add these lines to your `.env.local`:

```bash
# ============================================================
# AI PROVIDER CONFIGURATION
# ============================================================

# Primary provider (will fallback to others if rate limited)
AI_PROVIDER=groq

# ============================================================
# GROQ API KEYS (2 keys)
# Get keys from: https://console.groq.com/keys
# ============================================================
GROQ_API_KEY=gsk_your_groq_key_here
GROQ_API_KEY_2=gsk_your_second_groq_key_here

# ============================================================
# OPENAI API KEYS (4 keys)
# Get keys from: https://platform.openai.com/api-keys
# ============================================================
OPENAI_API_KEY=sk-proj-your_openai_key_here
OPENAI_API_KEY_2=sk-proj-your_second_openai_key_here
OPENAI_API_KEY_3=sk-proj-your_third_openai_key_here
OPENAI_API_KEY_4=sk-proj-your_fourth_openai_key_here

# ============================================================
# COHERE API KEY (1 key)
# Get keys from: https://dashboard.cohere.com/api-keys
# ============================================================
COHERE_API_KEY=your_cohere_key_here

# ============================================================
# HUGGINGFACE API KEY (1 key)
# Get keys from: https://huggingface.co/settings/tokens
# ============================================================
HUGGINGFACE_API_KEY=hf_your_huggingface_key_here
```

## How It Works

The key manager automatically:

1. **Rotates within provider**: If a key hits rate limit, tries next key
2. **Falls back to other providers**: If all keys for a provider fail, switches to next provider
3. **Cooldown management**: Failed keys enter cooldown (60s for rate limit, 1hr for auth errors)

### Fallback Chain

```
groq (2 keys) → openai (4 keys) → cohere (1 key) → huggingface (1 key)
```

### Provider Models

| Provider | Model | Speed | JSON Quality |
|----------|-------|-------|--------------|
| Groq | llama-3.3-70b-versatile | ⚡ Fastest | Good |
| OpenAI | gpt-4o-mini | Fast | ⭐ Best |
| Cohere | command-r-plus | Medium | Good |
| HuggingFace | Llama-3.3-70B-Instruct | Slow | Medium |

## After Updating

Run this to test:

```bash
npx tsx scripts/rewrite-editorial-reviews.ts --dry-run --limit=2
```

You should see:

```
🔑 AI Key Manager initialized:
   Groq keys: 2
   OpenAI keys: 4
   Cohere keys: 1
   HuggingFace keys: 1
```

