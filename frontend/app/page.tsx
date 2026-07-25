"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";

type Source = { source: string; page: number | null; type: string };

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; sources: Source[]; webUsed: boolean };

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function grow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIngestStatus(`${file.name} yuklanyapti… (katta PDF bir necha daqiqa olishi mumkin)`);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/ingest`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Backend ${res.status} qaytardi`);
      setIngestStatus(`✓ ${data.filename} yuklandi — ${data.chunks} bo'lak saqlandi. Endi u haqda so'rang.`);
    } catch (err: any) {
      setIngestStatus(null);
      setError(`Yuklashda xato: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  }

  async function send() {
    const q = question.trim();
    if (!q || loading) return;

    setError(null);
    setMessages((m) => [...m, { role: "user", content: q }]);
    setQuestion("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (res.status === 404) {
        throw new Error(
          `Backend topildi, lekin /chat yo'li yo'q (404). NEXT_PUBLIC_API_URL to'g'ri backend'ga ulanganini tekshiring — hozir "${API_URL}".`
        );
      }
      if (!res.ok) throw new Error(`Backend ${res.status} qaytardi`);

      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
          webUsed: data.web_used,
        },
      ]);
    } catch (e: any) {
      const network = e instanceof TypeError;
      setError(
        network
          ? `Backend'ga ulanib bo'lmadi (${API_URL}). U ishlayaptimi? (Bepul serverda birinchi so'rov ~1 daqiqa sekin bo'lishi mumkin.)`
          : e.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l1.9 5.2L19 9l-5.1 1.8L12 16l-1.9-5.2L5 9l5.1-1.8L12 2z" />
            </svg>
          </span>
          <div className="brand-text">
            <h1>AI Yordamchi</h1>
            <p>Savol bering yoki PDF yuklang</p>
          </div>
        </div>

        <label className="upload">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          PDF
          <input type="file" accept=".pdf,.txt,.md" onChange={upload} hidden />
        </label>
      </header>

      {ingestStatus && <div className="ingest-status">{ingestStatus}</div>}
      {error && <div className="error">{error}</div>}

      <div className="thread">
        {messages.length === 0 && !error && (
          <div className="empty">
            <div className="empty-mark" aria-hidden>
              <svg viewBox="0 0 24 24" width="27" height="27" fill="currentColor">
                <path d="M12 2l1.9 5.2L19 9l-5.1 1.8L12 16l-1.9-5.2L5 9l5.1-1.8L12 2z" />
              </svg>
            </div>
            <h2>Suhbatni boshlang</h2>
            <p>Istalgan tilda yozing — o'zbek, rus yoki ingliz. PDF yuklasangiz, javobni undan topaman; topilmasa, o'z bilimimdan javob beraman.</p>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="row user">
              <div className="bubble user">{m.content}</div>
            </div>
          ) : (
            <div key={i} className="row assistant">
              <div className="bubble assistant">
                <ReactMarkdown>{m.content}</ReactMarkdown>

                {m.sources.length > 0 && (
                  <div className="sources">
                    <span className="sources-title">
                      Manbalar{m.webUsed ? " (internet ham)" : ""}:
                    </span>
                    <div className="source-chips">
                      {m.sources.map((s, j) => (
                        <span key={j} className="source-chip">
                          {s.source}
                          {s.page ? `, ${s.page}-bet` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="row assistant">
            <div className="bubble assistant">
              <div className="thinking" aria-label="Yozyapti">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            grow(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Xabar yozing…"
          rows={1}
          disabled={loading}
        />
        <button className="send" type="submit" disabled={loading || !question.trim()} aria-label="Yuborish">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>
    </main>
  );
}
