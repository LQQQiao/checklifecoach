import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const port = 3000;

// 启用 CORS
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use(express.static('public'));

// DeepSeek R1 API 配置
const API_KEY = process.env.API_KEY;
const API_URL = process.env.API_URL;

if (!API_KEY || !API_URL) {
    console.error('错误：缺少必要的环境变量。请确保设置了 API_KEY 和 API_URL。');
    process.exit(1);
}

// 系统提示词
const SYSTEM_PROMPT = `你是一位专业的 Life Coach，拥有丰富的个人成长和生活指导经验。你的目标是：
1. 通过倾听和理解用户的问题，提供个性化的建议和指导
2. 帮助用户发现自身潜力，制定可行的成长计划
3. 在对话中保持积极、专业和支持性的态度
4. 根据用户的具体情况，提供实用的解决方案
请以友好、专业的方式与用户交流，帮助他们实现个人成长。`;

// 处理聊天请求
app.post('/chat', async (req, res) => {
    try {
        console.log('收到聊天请求');
        const userMessage = req.body.message;

        // 设置响应头，支持流式输出
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 记录环境变量状态（不记录实际值，只记录是否存在）
        console.log('API_KEY存在:', !!process.env.API_KEY);
        console.log('API_URL存在:', !!process.env.API_URL);

        // 准备请求数据
        const requestData = {
            model: 'deepseek-r1-250120',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            stream: true
        };

        // 发送请求到 DeepSeek R1 API
        console.log('开始发送API请求...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50000); // 50秒后中止请求
        
        let response;
        try {
            response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify(requestData),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId); // 清除超时计时器
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            console.log('API请求成功，状态码:', response.status);
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }

        // 处理流式响应
        for await (const chunk of response.body) {
            const text = chunk.toString();
            const lines = text.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        res.write('data: [DONE]\n\n');
                    } else {
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0].delta.content || '';
                            if (content) {
                                // 确保以SSE格式发送数据
                                res.write(`data: ${JSON.stringify({choices:[{delta:{content:content}}]})}

`);
                            }
                        } catch (e) {
                            console.error('解析响应数据失败:', e);
                        }
                    }
                } else {
                    // 处理非SSE格式的响应，转换为SSE格式
                    res.write(`data: ${JSON.stringify({choices:[{delta:{content:text}}]})}

`);
                }
            }
        }

        res.end();
    } catch (error) {
        console.error('处理请求时出错:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
})