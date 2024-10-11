import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

// 대화 기록을 JSON 파일에 저장하는 함수
const saveHistoryToFile = (history: Content[]) => {
  const filePath = path.join(process.cwd(), 'chat_history.json');
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf8');
};

// JSON 파일에서 대화 기록을 불러오는 함수
const loadHistoryFromFile = (): Content[] => {
  const filePath = path.join(process.cwd(), 'chat_history.json');
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    if (data.trim()) {
      return JSON.parse(data);
    }
  }
  return [];
};

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const { message, history } = await request.json();
    let parsedHistory: Content[] = history || [];

    // 중복된 사용자 메시지가 기록되지 않도록 방지
    if (parsedHistory.length > 0 && parsedHistory[parsedHistory.length - 1].role === 'user' && parsedHistory[parsedHistory.length - 1].parts[0].text === message) {
      return NextResponse.json({ error: '중복된 메시지입니다.' });
    }

    // 사용자 메시지를 한 번만 기록
    parsedHistory.push({ role: 'user', parts: [{ text: message }] });

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-002' });

    // 모델에게 메시지를 전달하여 응답 받음
    const chat = model.startChat({ history: parsedHistory });
    const response = await chat.sendMessage(message);

    if (!response || !response.response || typeof response.response.text !== 'function') {
      throw new Error('올바른 형식의 데이터를 반환하지 않았습니다.');
    }

    // 모델의 응답을 한 번만 기록
    const reply = response.response.text();
    parsedHistory.push({ role: 'model', parts: [{ text: reply }] });

    // 기록을 파일로 저장
    saveHistoryToFile(parsedHistory);

    return NextResponse.json({ reply });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    console.error('Error details:', error);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  try {
    const history = loadHistoryFromFile();
    return NextResponse.json({ history });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    console.error('Error loading chat history:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
