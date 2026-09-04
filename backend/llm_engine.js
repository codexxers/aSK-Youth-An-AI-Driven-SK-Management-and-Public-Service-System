import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ---------------------------------------------------------------------------
// Gemini free-tier model rotation
// Priority-ordered: 500-RPD lite models first, then 20-RPD overflow.
// Model IDs verified against ai.google.dev/gemini-api/docs/models on 2026-09-04.
// Excluded (not free / shut down): gemini-3.1-pro-preview, gemini-2.5-pro,
//   gemini-2.0-flash (shut down), gemini-2.0-flash-lite (shut down).
// ---------------------------------------------------------------------------
const GEMINI_MODELS = [
    { id: 'gemini-3.1-flash-lite',  rpd: 500 }, // highest daily headroom — try first
    { id: 'gemini-3.5-flash-lite',  rpd: 500 }, // second-highest daily headroom
    { id: 'gemini-2.5-flash',       rpd: 20  }, // 20-RPD overflow models below
    { id: 'gemini-2.5-flash-lite',  rpd: 20  },
    { id: 'gemini-3-flash-preview', rpd: 20  },
    { id: 'gemini-3.5-flash',       rpd: 20  },
    { id: 'gemini-3.6-flash',       rpd: 20  }, // previously the only model
    { id: 'gemini-3.7-flash',       rpd: 20  },
    { id: 'gemini-3.8-flash',       rpd: 20  },
];

// In-memory per-UTC-day request counters.
// Shape: Map<modelId, { date: 'YYYY-MM-DD', count: number }>
// Resets on process restart (intentional — Google's API is the real enforcement backstop;
// a slightly-off local count just means an occasional extra attempt that gets correctly
// rejected and cascaded past, not a correctness bug).
// ASSUMPTION: Google resets daily free-tier quotas at UTC midnight. Their docs say
// "per day" without specifying a timezone anchor in a single canonical location.
const _geminiCounters = new Map();

function _utcDate() {
    return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function _getCount(modelId) {
    const today = _utcDate();
    const entry = _geminiCounters.get(modelId);
    if (!entry || entry.date !== today) return 0;
    return entry.count;
}

function _increment(modelId) {
    const today = _utcDate();
    const entry = _geminiCounters.get(modelId);
    if (!entry || entry.date !== today) {
        _geminiCounters.set(modelId, { date: today, count: 1 });
    } else {
        entry.count++;
    }
}

function _markExhausted(modelId, rpd) {
    _geminiCounters.set(modelId, { date: _utcDate(), count: rpd });
}

// ---------------------------------------------------------------------------
// generateResponse
// Returns: { text: string, modelUsed: string, tier: 'gemini'|'groq'|'openrouter' }
// ---------------------------------------------------------------------------
export async function generateResponse(systemPrompt, userPrompt, chatHistory = [], options = {}, onToken = null, onPhase = null) {
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 2048;

    // Format chat history for Gemini
    const geminiHistory = chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));
    geminiHistory.push({ role: 'user', parts: [{ text: userPrompt }] });

    // Format chat history for OpenAI-compatible APIs (Groq, OpenRouter)
    const openAIHistory = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        })),
        { role: 'user', content: userPrompt }
    ];

    let lastError = null;

    // ── TIER 1: Gemini rotation ───────────────────────────────────────────────
    // Tries each model in priority order. Skips without a network call if the
    // local daily counter is at or above the known RPD cap. On a quota/rate-limit
    // error from the API, marks that model exhausted for the rest of the day and
    // immediately tries the next one — transparent to the caller.
    if (genAI) {
        for (const { id: modelId, rpd } of GEMINI_MODELS) {
            const localCount = _getCount(modelId);
            if (localCount >= rpd) {
                console.log(`[LLM Engine] Gemini ${modelId}: local counter ${localCount}/${rpd} — skipping (locally exhausted).`);
                continue;
            }

            try {
                if (onPhase) onPhase('GENERATING', `Generating response (Gemini: ${modelId})...`);

                const model = genAI.getGenerativeModel({
                    model: modelId,
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                });

                _increment(modelId);

                let text;
                if (onToken) {
                    const result = await model.generateContentStream({
                        contents: geminiHistory,
                        generationConfig: { temperature, maxOutputTokens: maxTokens }
                    });
                    let fullText = '';
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        fullText += chunkText;
                        onToken(chunkText);
                    }
                    text = fullText;
                } else {
                    const result = await model.generateContent({
                        contents: geminiHistory,
                        generationConfig: { temperature, maxOutputTokens: maxTokens }
                    });
                    text = result.response.text();
                }

                console.log(`[LLM Engine] Tier 1 served by: ${modelId} (${_getCount(modelId)}/${rpd} RPD used today)`);
                return { text, modelUsed: modelId, tier: 'gemini' };

            } catch (err) {
                const msg = err.message || '';
                const isQuota = msg.includes('429') ||
                                msg.toLowerCase().includes('quota') ||
                                msg.toLowerCase().includes('rate') ||
                                msg.toLowerCase().includes('resource_exhausted');

                console.warn(`[LLM Engine] Gemini ${modelId} failed (${isQuota ? 'quota/rate-limit' : 'error'}): ${msg}`);

                if (isQuota) {
                    // Locally mark exhausted so future requests in this process skip it
                    _markExhausted(modelId, rpd);
                    console.log(`[LLM Engine] Gemini ${modelId}: marked locally exhausted for today. Cascading to next model...`);
                }
                lastError = err;
                // Continue to next model in rotation regardless of error type
            }
        }
        // All Gemini models tried — fall through to Groq
        console.warn('[LLM Engine] All Gemini models exhausted or failed. Falling through to Tier 2 (Groq).');
        if (onPhase) onPhase('RETRYING', 'All Gemini quotas exhausted — retrying with backup AI provider (Tier 2: Groq)...');
    }

    // ── TIER 2: Groq ─────────────────────────────────────────────────────────
    // Completely unchanged logic from original. Only the return shape wraps the result.
    if (groq) {
        try {
            if (onToken) {
                const stream = await groq.chat.completions.create({
                    messages: openAIHistory,
                    model: 'qwen/qwen3.8-27b',
                    temperature: temperature,
                    max_tokens: maxTokens,
                    stream: true
                });
                let fullText = '';
                for await (const chunk of stream) {
                    const chunkText = chunk.choices[0]?.delta?.content || '';
                    fullText += chunkText;
                    onToken(chunkText);
                }
                return { text: fullText, modelUsed: 'qwen/qwen3.8-27b', tier: 'groq' };
            } else {
                const completion = await groq.chat.completions.create({
                    messages: openAIHistory,
                    model: 'qwen/qwen3.8-27b',
                    temperature: temperature,
                    max_tokens: maxTokens,
                });
                return { text: completion.choices[0].message.content, modelUsed: 'qwen/qwen3.8-27b', tier: 'groq' };
            }
        } catch (err) {
            console.warn(`[LLM Engine] Tier 2 (Groq) failed: ${err.message}. Retrying...`);
            lastError = err;
            if (onPhase) onPhase('RETRYING', 'Retrying with fallback AI provider (Tier 3: OpenRouter)...');
        }
    }

    // ── TIER 3: OpenRouter ───────────────────────────────────────────────────
    // Completely unchanged logic from original. Only the return shape wraps the result.
    if (OPENROUTER_API_KEY) {
        try {
            if (onToken) {
                const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                    model: 'openrouter/free',
                    messages: openAIHistory,
                    temperature: temperature,
                    max_tokens: maxTokens,
                    stream: true
                }, {
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'HTTP-Referer': 'https://askyouth.online',
                        'X-Title': 'aSK Youth AI'
                    },
                    responseType: 'stream'
                });

                return new Promise((resolve, reject) => {
                    let fullText = '';
                    response.data.on('data', chunk => {
                        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
                        for (const line of lines) {
                            if (line.replace(/^data: /, '') === '[DONE]') return resolve({ text: fullText, modelUsed: 'openrouter/free', tier: 'openrouter' });
                            if (line.startsWith('data: ')) {
                                try {
                                    const parsed = JSON.parse(line.slice(6));
                                    const chunkText = parsed.choices[0]?.delta?.content || '';
                                    fullText += chunkText;
                                    onToken(chunkText);
                                } catch (e) {}
                            }
                        }
                    });
                    response.data.on('end', () => resolve({ text: fullText, modelUsed: 'openrouter/free', tier: 'openrouter' }));
                    response.data.on('error', err => reject(err));
                });
            } else {
                const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                    model: 'openrouter/free',
                    messages: openAIHistory,
                    temperature: temperature,
                    max_tokens: maxTokens,
                }, {
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'HTTP-Referer': 'https://askyouth.online',
                        'X-Title': 'aSK Youth AI'
                    }
                });
                return { text: response.data.choices[0].message.content, modelUsed: 'openrouter/free', tier: 'openrouter' };
            }
        } catch (err) {
            console.warn(`[LLM Engine] Tier 3 (OpenRouter) failed: ${err.message}`);
            lastError = err;
        }
    }

    throw new Error(`All AI fallback tiers failed. Last error: ${lastError?.message}`);
}

