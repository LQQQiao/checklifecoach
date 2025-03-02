// 获取必要的 DOM 元素
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// 添加消息到聊天窗口
function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    // 添加头像
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    messageDiv.appendChild(avatar);
    
    // 添加消息内容容器
    const content = document.createElement('div');
    content.className = 'content';
    content.innerHTML = `<p style="margin: 0">${text.replace(/\n/g, '<br>')}</p>`;
    messageDiv.appendChild(content);
    
    // 添加时间戳
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    const now = new Date();
    timestamp.textContent = now.toLocaleTimeString();
    content.appendChild(timestamp);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 显示思考中提示
function showThinkingIndicator() {
    const id = Date.now().toString();
    return id;
}

// 移除思考中提示
function removeThinkingIndicator(id) {
    const overlay = document.querySelector('.thinking-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// 在页面加载完成后显示 AI 欢迎语
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        addMessage('你好！我是你的 AI 生活教练。我可以帮助你解决生活中的各种问题，提供个性化的建议和指导。让我们开始对话吧！', 'assistant');
    }, 1000);

    // 绑定发送按钮点击事件
    sendButton.addEventListener('click', handleUserInput);

    // 绑定输入框回车事件
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserInput();
        }
    });

    // 绑定输入框自动调整高度
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
    });
});

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

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'thinking-overlay';
        document.body.appendChild(overlay);

        // 创建思考中提示框
        const thinkingBox = document.createElement('div');
        thinkingBox.className = 'thinking-box';
        const thinkingTexts = [
            'AI正在冥思苦想...',
            '让我想想...',
            '正在组织语言...',
            '思考中...',
            '让我好好想想这个问题...',
            '正在激活创意模式...'
        ];
        const randomText = thinkingTexts[Math.floor(Math.random() * thinkingTexts.length)];
        thinkingBox.innerHTML = `
            <div class="thinking-dots">
                <span></span>
            </div>
            <p>${randomText}</p>
        `;
        overlay.appendChild(thinkingBox);

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
            aiMessageDiv.className = 'message ai-message';
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