import { getLlama, LlamaChatSession } from "node-llama-cpp";
import path from "path";

const modelPath = path.join("E:", "Programmings", "htdocs", "Tailwind", "LLMA3BGGUF", "Llama-3.2-3B-Instruct-Q4_K_M.gguf");

async function testHistory() {
    const llama = await getLlama();
    const model = await llama.loadModel({ modelPath });
    const context = await model.createContext();
    
    // Test with pre-loaded history
    const sequence = context.getSequence();
    const session = new LlamaChatSession({
        contextSequence: sequence,
        systemPrompt: "You are AI//SYNC. Be brief.",
        // Passing some mock history
    });
    
    // Usually in node-llama-cpp setting history is:
    session.setChatHistory([
        { type: "user", text: "My name is John. Try to remember it." },
        { type: "model", text: "I will remember that your name is John." }
    ]);
    
    const reply = await session.prompt("What is my name?");
    console.log("Memory Test Reply:", reply);
    
    sequence.dispose();
}
testHistory().catch(console.error);
