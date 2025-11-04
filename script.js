document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');

    // Add a welcome message
    addMessageToChat('bot', 'Hello! How can I help you today?');

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const userMessage = messageInput.value.trim();
        if (userMessage) {
            addMessageToChat('user', userMessage);
            messageInput.value = '';
            
            // Simulate bot response
            setTimeout(() => {
                const botResponse = getBotResponse(userMessage);
                addMessageToChat('bot', botResponse);
            }, 1000);
        }
    });

    function addMessageToChat(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);

        // Scroll to the bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function getBotResponse(userInput) {
        const lowerCaseInput = userInput.toLowerCase();

        if (lowerCaseInput.includes('hello') || lowerCaseInput.includes('hi')) {
            return 'Hi there! What can I do for you?';
        } else if (lowerCaseInput.includes('how are you')) {
            return "I'm just a bunch of code, but I'm doing great! Thanks for asking.";
        } else if (lowerCaseInput.includes('help')) {
            return 'Sure, I can help. What do you need assistance with?';
        } else if (lowerCaseInput.includes('bye')) {
            return 'Goodbye! Have a great day.';
        } else {
            return "I'm not sure how to answer that yet. I am still learning!";
        }
    }
});