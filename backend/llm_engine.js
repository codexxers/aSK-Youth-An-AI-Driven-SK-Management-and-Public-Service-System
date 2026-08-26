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

    // TIER 1: Gemini
    if (genAI) {
        try {
            if (onPhase) onPhase('GENERATING', 'Generating response (Tier 1: Gemini)...');
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                systemInstruction: systemPrompt
            });

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
                return fullText;
            } else {
                const result = await model.generateContent({
                    contents: geminiHistory,
                    generationConfig: { temperature, maxOutputTokens: maxTokens }
                });
                return result.response.text();
            }
        } catch (err) {
            console.warn(`[LLM Engine] Tier 1 (Gemini) failed: ${err.message}. Retrying...`);
            lastError = err;
            if (onPhase) onPhase('RETRYING', 'Retrying with backup AI provider (Tier 2: Groq)...');
        }
    }

    // TIER 2: Groq
    if (groq) {
        try {
            if (onToken) {
                const stream = await groq.chat.completions.create({
                    messages: openAIHistory,
                    model: 'llama-3.3-70b-versatile',
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
                return fullText;
            } else {
                const completion = await groq.chat.completions.create({
                    messages: openAIHistory,
                    model: 'llama-3.3-70b-versatile',
                    temperature: temperature,
                    max_tokens: maxTokens,
                });
                return completion.choices[0].message.content;
            }
        } catch (err) {
            console.warn(`[LLM Engine] Tier 2 (Groq) failed: ${err.message}. Retrying...`);
            lastError = err;
            if (onPhase) onPhase('RETRYING', 'Retrying with fallback AI provider (Tier 3: OpenRouter)...');
        }
    }

    // TIER 3: OpenRouter
    if (OPENROUTER_API_KEY) {
        try {
            if (onToken) {
                const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                    model: 'meta-llama/llama-3.3-70b-instruct:free',
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
                            if (line.replace(/^data: /, '') === '[DONE]') return resolve(fullText);
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
                    response.data.on('end', () => resolve(fullText));
                    response.data.on('error', err => reject(err));
                });
            } else {
                const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                    model: 'meta-llama/llama-3.3-70b-instruct:free',
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
                return response.data.choices[0].message.content;
            }
        } catch (err) {
            console.warn(`[LLM Engine] Tier 3 (OpenRouter) failed: ${err.message}`);
            lastError = err;
        }
    }

    throw new Error(`All AI fallback tiers failed. Last error: ${lastError?.message}`);
}
