import { getLlama, LlamaChatSession } from "node-llama-cpp";
import path from "path";

const modelPath = path.join("E:", "Programmings", "htdocs", "Tailwind", "LLMA3BGGUF", "Llama-3.2-3B-Instruct-Q4_K_M.gguf");

async function run() {
    console.log("Loading Llama...");
    try {
        const llama = await getLlama();
        const model = await llama.loadModel({ modelPath });
        const context = await model.createContext();
        const session = new LlamaChatSession({ contextSequence: context.getSequence() });
        console.log("Prompting...");
        const reply = await session.prompt("Hello");
        console.log("Reply Type:", typeof reply);
        console.log("Reply:", reply);
    } catch (err) {
        console.error("Inference Error:", err.stack);
    }
}
run();
