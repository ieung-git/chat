import axios from 'axios';

const apiKey = process.env.NEXT_PUBLICK_GOOGLE_API_KEY;

const getGenerativeAIResponse = async (messages: Array<{ userId: string; text: string }>) => {
  try {
    const response = await axios.post(
      'https://generativeai.googleapis.com/v1beta/projects/YOUR_PROJECT_ID/locations/us-central1/models/text-bison/completions:generateText',
      {
        prompt: messages.map((message) => `${message.userId}: ${message.text}`).join('\n'),
        temperature: 0.7, // AI 응답의 창의성 레벨 (0-1)
        max_tokens: 1024, // 최대 토큰 수
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.completions[0].content;
  } catch (error) {
    console.error('API 호출 오류:', error);
    return 'API 오류 발생';
  }
};

export { getGenerativeAIResponse };