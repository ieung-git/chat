import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import AWS from 'aws-sdk';

// AWS S3 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  region: process.env.NEXT_PUBLIC_AWS_REGION,
});
const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;

if (!BUCKET_NAME) {
  throw new Error('S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다.');
}

// S3에 기록 저장하는 함수
const saveHistoryToS3 = async (history: Content[], fileName: string) => {
  if (!BUCKET_NAME) {
    throw new Error('S3 버킷 이름이 설정되지 않았습니다.');
  }

  const params = {
    Bucket: BUCKET_NAME,
    Key: `chat-history/${fileName}`,
    Body: JSON.stringify(history, null, 2),
    ContentType: 'application/json',
  };

  console.log('Saving history to S3:', JSON.stringify(history, null, 2));

  return s3.putObject(params).promise();
};

// S3에서 기록 불러오는 함수
const loadHistoryFromS3 = async (fileName: string): Promise<Content[]> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: `chat-history/${fileName}`,
  };

  try {
    const data = await s3.getObject(params).promise();
    const history = JSON.parse(data.Body!.toString('utf-8'));
    console.log('Loaded history from S3:', JSON.stringify(history, null, 2));
    return history;
  } catch (error) {
    console.error('Error loading history from S3:', error);
    return [];
  }
};

export async function POST(request: NextRequest) {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const fileName = 'chat_history.json';

  if (!API_KEY) {
    return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const { message } = await request.json();
    
    // S3에서 현재 히스토리 로드
    const parsedHistory: Content[] = await loadHistoryFromS3(fileName);

    // 중복된 사용자 메시지가 기록되지 않도록 방지
    if (parsedHistory.length > 0 && 
        parsedHistory[parsedHistory.length - 1].role === 'user' && 
        parsedHistory[parsedHistory.length - 1].parts[0].text === message) {
      return NextResponse.json({ error: '중복된 메시지입니다.' });
    }

    // 사용자 메시지를 기록
    parsedHistory.push({ role: 'user', parts: [{ text: message }] });

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-002' });

    // 모델에 메시지를 전달하여 응답을 받음
    const chat = model.startChat({ history: parsedHistory });
    const response = await chat.sendMessage(message);

    if (!response || !response.response || typeof response.response.text !== 'function') {
      throw new Error('올바른 형식의 데이터를 반환하지 않았습니다.');
    }

    // 모델의 응답 기록
    const reply = response.response.text();
    parsedHistory.push({ role: 'model', parts: [{ text: reply }] });

    // S3에 기록 저장
    await saveHistoryToS3(parsedHistory, fileName);

    return NextResponse.json({ reply, history: parsedHistory });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    console.error('Error details:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  const fileName = 'chat_history.json'; // S3에서 불러올 파일 이름

  try {
    const history = await loadHistoryFromS3(fileName);
    return NextResponse.json({ history });
  } catch (error: unknown) { // error 타입을 unknown으로 변경
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    console.error('Error loading chat history:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
