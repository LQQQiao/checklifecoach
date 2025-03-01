// 获取 DOM 元素
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

// 添加消息到聊天区域
function addMessage(content, type = 'user') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    const paragraph = document.createElement('p');
    // 使用 textContent 而不是 innerHTML 来防止 XSS
    paragraph.textContent = content;
    // 将换行符转换为 <br>
    paragraph.innerHTML = paragraph.textContent.replace(/\n/g, '<br>');
    messageDiv.appendChild(paragraph);
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
    
    // 延迟0.5秒显示思考中提示
    setTimeout(async () => {
        // 添加思考中提示
        const thinkingId = showThinkingIndicator();

    try {
        // 发送请求到服务器
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const errorStatus = response.status;
            throw new Error(`网络请求失败 (状态码: ${errorStatus})`);
        }

        // 移除思考中提示
        removeThinkingIndicator(thinkingId);

        // 创建新的 AI 消息容器
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message assistant';
        const aiMessageContent = document.createElement('p');
        // 确保没有多余的空格
        aiMessageContent.style.margin = '0';
        aiMessageDiv.appendChild(aiMessageContent);
        chatMessages.appendChild(aiMessageDiv);

        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            
            // 增强对不同响应格式的处理
            try {
                // 尝试检测是否为 SSE 格式
                if (text.includes('data: ')) {
                    const lines = text.split('\n').filter(line => line.trim() !== '');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6).trim();
                            if (data === '[DONE]') {
                                continue;
                            } else {
                                try {
                                    const parsed = JSON.parse(data);
                                    const content = parsed.choices?.[0]?.delta?.content || '';
                                    if (content) {
                                        aiResponse += content;
                                    }
                                } catch (e) {
                                    // 如果解析失败，直接使用文本
                                    console.error('JSON解析失败:', e.message, '原始数据:', data);
                                    aiResponse += data;
                                }
                            }
                        }
                    }
                } else {
                    // 直接使用文本内容
                    aiResponse += text;
                }
            } catch (e) {
                // 出错时直接使用文本
                aiResponse += text;
                console.error('解析响应数据失败:', e.message, '原始文本:', text.substring(0, 100));
            }
            
            // 更新UI显示
            aiMessageContent.innerHTML = aiResponse.replace(/\n/g, '<br>');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (error) {
        // 移除思考中提示
        removeThinkingIndicator(thinkingId);
        
        console.error('请求失败:', error);
        // 提供更详细的错误信息
        let errorMessage = '抱歉，发生了一些错误';
        if (error.message.includes('网络请求失败')) {
            errorMessage = `${error.message}。请检查您的网络连接或服务器状态。`;
        } else if (error.message.includes('timeout')) {
            errorMessage = '请求超时。服务器响应时间过长，请稍后再试。';
        } else if (error.message.includes('JSON')) {
            errorMessage = '数据解析错误。服务器返回了无效的数据格式。';
        } else {
            errorMessage = `${errorMessage}: ${error.message}`;
        }
        addMessage(errorMessage, 'system');
    }
    }, 500); // 延迟0.5秒
}

// 显示思考中提示
function showThinkingIndicator() {
    const id = Date.now().toString();
    // 创建悬浮的思考提示元素
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking-indicator';
    thinkingDiv.id = `thinking-${id}`;
    
    // 创建有趣的思考提示内容
    const thinkingContent = document.createElement('p');
    const thinkingTexts = [
        'AI Coach 正在冥思苦想... 🧠✨',
        'AI Coach 正在翻阅智慧宝库... 📚🔍',
        'AI Coach 正在连接星际智慧... 🌌🔮',
        'AI Coach 正在激活神经元... ⚡🧬',
        'AI Coach 正在思考人生哲学... 🤔💭',
        'AI Coach 正在煮一杯思考咖啡... ☕💡'
    ];
    const randomText = thinkingTexts[Math.floor(Math.random() * thinkingTexts.length)];
    thinkingContent.innerHTML = `<span class="thinking-dots">${randomText}</span>`;
    thinkingDiv.appendChild(thinkingContent);
    
    // 将思考提示添加到 body 中，而不是聊天消息区域
    document.body.appendChild(thinkingDiv);
    
    return id;
}

function removeThinkingIndicator(id) {
    const thinkingDiv = document.getElementById(`thinking-${id}`);
    if (thinkingDiv) {
        thinkingDiv.remove();
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

// 自适应文本框高度
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
});