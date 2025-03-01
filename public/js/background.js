document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    let isProcessing = false;

    function appendMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'message user-message' : 'message ai-message';
        messageDiv.textContent = content;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage() {
        if (isProcessing) return;

        const message = userInput.value.trim();
        if (!message) return;

        isProcessing = true;
        appendMessage(message, true);
        userInput.value = '';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error('网络请求失败');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponse = '';
            let responseDiv = document.createElement('div');
            responseDiv.className = 'message ai-message';
            chatMessages.appendChild(responseDiv);

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);
                const lines = text.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0].delta.content || '';
                            aiResponse += content;
                            responseDiv.textContent = aiResponse;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        } catch (e) {
                            console.error('解析响应数据失败:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            appendMessage('抱歉，发生了一些错误。请稍后重试。');
        } finally {
            isProcessing = false;
        }
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}));