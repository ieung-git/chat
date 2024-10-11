"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ role: string; parts: { text: string }[] }[]>([]);
  const messageListRef = useRef<HTMLDivElement>(null);

  // 페이지 로드 시 이전 대화 기록 불러오기
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch("/api/chat");
        const data = await res.json();
        if (res.ok) {
          setHistory(data.history);
        } else {
          console.error("Error loading history:", data.error);
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    loadHistory();
  }, []);

  // 스크롤 하단으로 자동 이동
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [history]);

  const handleSend = async () => {
    if (!message.trim()) {
      setResponse("메시지를 입력해주세요.");
      return;
    }

    if (loading) return; // 중복 요청 방지

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, history }), // history에 미리 메시지를 추가하지 않음
      });

      const data = await res.json();

      if (res.ok) {
        // 서버 응답을 받고 나서만 history에 추가
        setHistory((prevHistory) => [
          ...prevHistory,
          { role: "user", parts: [{ text: message }] }, // 사용자 메시지 추가
          { role: "model", parts: [{ text: data.reply }] } // 모델 응답 추가
        ]);
        setResponse(data.reply);
      } else {
        setResponse(data.error || "오류가 발생했습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("Error:", error);
      setResponse("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setMessage(""); // 메시지 입력창 초기화
    }
  };

  return (
    <div className="chatApi">
      <div className="markUp" ref={messageListRef}>
        {history.map((item, index) => (
          <div key={index} className="chat-pair">
            {item.role === 'user' && (
              <div className="chat_u">
                <ReactMarkdown>{item.parts[0]?.text || ""}</ReactMarkdown>
              </div>
            )}
            {item.role === 'model' && (
              <div className="chat_a">
                <ReactMarkdown>{item.parts[0]?.text || ""}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
      </div>

      {loading && <p>로딩 중...</p>}
      <div className="chatText">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="메시지를 입력하세요"
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading}>
          {loading ? "보내는 중..." : "보내기"}
        </button>
      </div>
    </div>
  );
}
