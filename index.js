const readline = require('readline');

// Simple function to simulate AI response generation
function generateAiResponse(userMessage) {
    const lowerCaseMsg = userMessage.toLowerCase();
    if (lowerCaseMsg.includes('hello') || lowerCaseMsg.includes('hi')) {
        return "Hello! I am Lorex, an AI assistant. How can I help you today?";
    } else if (lowerCaseMsg.includes('how are you')) {
        return "I am a language model, so I don't have feelings, but I am functioning perfectly and ready to chat!";
    } else if (lowerCaseMsg.includes('name')) {
        return "My name is Lorex.";
    } else if (lowerCaseMsg.includes('weather') || lowerCaseMsg.includes('forecast')) {
        return "Simulated Weather Report: The current forecast for your location is 75°F and partly cloudy.";
    } else if (lowerCaseMsg.includes('bye') || lowerCaseMsg.includes('exit')) {
        return "Goodbye! It was nice chatting with you. Come back anytime!";
    } else {
        // Default response for unknown queries
        const responses = [
            "That's an interesting point. Can you tell me more?",
            "I need a little more information to answer that.",
            "Let's explore that topic further!",
            "Could you rephrase your question?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

// Set up readline interface for console interaction
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function startChat() {
    console.log("===============================");
    console.log("         Lorex AI Chatbot       ");
    console.log("===============================");
    console.log("Type 'bye' or 'exit' to end the conversation.\n");

    const chatLoop = () => {
        rl.question('You: ', (userInput) => {
            const message = userInput.trim();
            if (message.toLowerCase() === 'bye' || message.toLowerCase() === 'exit') {
                console.log("\nLorex: Goodbye! It was nice chatting with you.");
                rl.close();
                return;
            }

            // Get AI response and display it
            const aiResponse = generateAiResponse(message);
            console.log(`\nLorex: ${aiResponse}\n`);

            // Continue the conversation loop
            chatLoop();
        });
    };

    chatLoop();
}
