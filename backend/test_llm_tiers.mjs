// Quick live test of all 3 LLM tiers. Run from backend/ directory.
// Usage: node --experimental-vm-modules test_llm_tiers.mjs
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GROQ_KEY   = process.env.GROQ_API_KEY;
const OR_KEY     = process.env.OPENROUTER_API_KEY;

console.log('Keys loaded:');
console.log('  GEMINI_API_KEY:     ', GEMINI_KEY   ? GEMINI_KEY.slice(0,10)   + '...' : '(MISSING)');
console.log('  GROQ_API_KEY:       ', GROQ_KEY     ? GROQ_KEY.slice(0,10)     + '...' : '(MISSING)');
console.log('  OPENROUTER_API_KEY: ', OR_KEY       ? OR_KEY.slice(0,10)       + '...' : '(MISSING)');
console.log('');

// ─── TIER 1: Gemini ───────────────────────────────────────────────────────────
if (GEMINI_KEY) {
    try {
        console.log('[T1] Testing Gemini gemini-3.6-flash...');
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash', systemInstruction: 'Be concise.' });
        const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'Reply OK' }] }] });
        console.log('[T1] ✅ Gemini OK:', result.response.text().trim().slice(0, 60));
    } catch (e) {
        console.error('[T1] ❌ Gemini FAILED:', e.status ?? '', e.message);
    }
} else {
    console.warn('[T1] ⚠️  GEMINI_API_KEY missing — Tier 1 will be skipped at runtime.');
}

// ─── TIER 2: Groq ─────────────────────────────────────────────────────────────
if (GROQ_KEY) {
    try {
        console.log('[T2] Testing Groq qwen/qwen3.8-27b...');
        const groq = new Groq({ apiKey: GROQ_KEY });
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: 'Reply OK' }],
            model: 'qwen/qwen3.8-27b',
            max_tokens: 10,
        });
        console.log('[T2] ✅ Groq OK:', completion.choices[0].message.content.trim());
    } catch (e) {
        console.error('[T2] ❌ Groq FAILED:', e.status ?? e.response?.status ?? '', e.message);
    }
} else {
    console.warn('[T2] ⚠️  GROQ_API_KEY missing — Tier 2 will be skipped at runtime.');
}

// ─── TIER 3: OpenRouter ───────────────────────────────────────────────────────
if (OR_KEY) {
    try {
        console.log('[T3] Testing OpenRouter meta-llama/llama-3.2-3b-instruct...');
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'meta-llama/llama-3.2-3b-instruct',
            messages: [{ role: 'user', content: 'Reply OK' }],
            max_tokens: 10,
        }, {
            headers: {
                'Authorization': `Bearer ${OR_KEY}`,
                'HTTP-Referer': 'https://askyouth.online',
                'X-Title': 'aSK Youth AI'
            }
        });
        console.log('[T3] ✅ OpenRouter OK:', response.data.choices[0].message.content.trim());
    } catch (e) {
        console.error('[T3] ❌ OpenRouter FAILED status', e.response?.status ?? e.message);
        if (e.response?.data) console.error('      Response body:', JSON.stringify(e.response.data).slice(0, 300));
    }
} else {
    console.warn('[T3] ⚠️  OPENROUTER_API_KEY missing — Tier 3 will be skipped at runtime.');
}
