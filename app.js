// 获取 DOM 元素
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

// 添加消息到聊天区域
function addMessage(content, type = 'user') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `<p>${content}</p>`;
    chatMessages.appendChild(messageDiv);
    // 滚动到最新消息
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 处理用户输入
async function handleUserInput() {
    const message = messageInput.value.trim();
    if (!message) return;

    // 显示用户消息
    addMessage(message, 'user');
    messageInput.value = '';
    messageInput.style.height = 'auto';

    try {
        // 发送请求到服务器
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) throw new Error('网络请求失败');

        // 创建新的 AI 消息容器
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message assistant';
        const aiMessageContent = document.createElement('p');
        aiMessageDiv.appendChild(aiMessageContent);
        chatMessages.appendChild(aiMessageDiv);

        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        break;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            aiResponse += parsed.content;
                            aiMessageContent.textContent = aiResponse;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (e) {
                        console.error('解析响应数据失败:', e);
                    }
                }
            }
        }
    } catch (error) {
        console.error('请求失败:', error);
        addMessage('抱歉，发生了一些错误，请稍后再试。', 'system');
    }
}

// 发送按钮点击事件
sendButton.addEventListener('click', handleUserInput);

// 输入框回车事件
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserInput();
    }
});

// 输入框自适应高度
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
});