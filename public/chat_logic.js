// Chat Logic
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        // Add User Message
        addMessage(message, 'user');
        chatInput.value = '';

        // Show Loading
        const loadingId = addMessage("En train d'écrire...", 'ai', true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            
            // Remove Loading
            const loadingElement = document.getElementById(loadingId);
            if(loadingElement) loadingElement.remove();

            // Add AI Message
            addMessage(data.response || "Désolé, une erreur est survenue.", 'ai');

        } catch (error) {
            console.error(error);
            const loadingElement = document.getElementById(loadingId);
            if(loadingElement) loadingElement.remove();
            addMessage("Erreur de connexion au serveur.", 'ai');
        }
    });
}

function addMessage(text, sender, isLoading = false) {
    const isUser = sender === 'user';
    const id = 'msg-' + Date.now();
    
    const div = document.createElement('div');
    div.className = `flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`;
    div.id = id;

    div.innerHTML = `
        <div class="w-8 h-8 rounded-full ${isUser ? 'bg-gray-200' : 'bg-enit-blue'} flex items-center justify-center ${isUser ? 'text-gray-600' : 'text-white'} text-xs font-bold shadow-sm">
            ${isUser ? 'Moi' : 'AI'}
        </div>
        <div class="${isUser ? 'bg-enit-blue text-white' : 'bg-white text-gray-700 border border-gray-100'} p-3 rounded-2xl ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'} shadow-sm text-sm max-w-[80%] ${isLoading ? 'italic text-gray-400' : ''}">
            ${text}
        </div>
    `;

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}
