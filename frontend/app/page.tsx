"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";

type Source = { source: string; page: number | null; type: string };

type Message =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      steps: string[];
      sources: Source[];
      webUsed: boolean;
    };

const STEP_LABEL: Record<string, string> = {
  retrieve: "retrieve",
  grade_documents: "grade docs",
  web_search: "web search",
  generate: "generate",
};

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIngestStatus(`Ingesting ${file.name}… (large PDFs can take a few minutes)`);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/ingest`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Backend returned ${res.status}`);
      setIngestStatus(`Ingested ${data.filename}: ${data.chunks} chunks stored.`);
    } catch (err: any) {
      setIngestStatus(null);
      setError(`Ingest failed: ${err.message}`);
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
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (res.status === 404) {
        throw new Error(
          `The backend was reached but has no /chat route (404). ` +
            `Check that NEXT_PUBLIC_API_URL points to your deployed backend — ` +
            `currently "${API_URL}".`
        );
      }
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);

      const data = await res.json();

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer,
          steps: data.steps || [],
          sources: data.sources || [],
          webUsed: data.web_used,
        },
      ]);
    } catch (e: any) {
      const networkError = e instanceof TypeError; // fetch couldn't connect at all
      setError(
        networkError
          ? `Couldn't reach the backend at ${API_URL}. Is it running and is NEXT_PUBLIC_API_URL set correctly?`
          : e.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <div className="header">
        <h1>Adaptive Agentic RAG</h1>
        <p>Retrieves, grades its own evidence, falls back to the web, and self-checks before answering.</p>
      </div>

      <div className="ingest">
        <label className="upload">
          Upload a document
          <input type="file" accept=".pdf,.txt,.md" onChange={upload} hidden />
        </label>
        {ingestStatus && <span className="ingest-status">{ingestStatus}</span>}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="thread">
        {messages.length === 0 && !error && (
          <div className="empty">Ask something about your ingested documents.</div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="bubble user">{m.content}</div>
          ) : (
            <div key={i} className="bubble assistant">
              <div>{m.content}</div>

              {m.steps.length > 0 && (
                <div className="steps">
                  {m.steps.map((s, j) => (
                    <span key={j} className={`pill ${s}`}>
                      {STEP_LABEL[s] || s}
                    </span>
                  ))}
                </div>
              )}

              {m.sources.length > 0 && (
                <div className="sources">
                  Sources{m.webUsed ? " (includes web results)" : ""}:
                  <ul>
                    {m.sources.map((s, j) => (
                      <li key={j}>
                        [{s.type}] {s.source}
                        {s.page ? `, p. ${s.page}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        )}

        {loading && <div className="bubble assistant">Thinking…</div>}
      </div>

      <div className="composer">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a question…"
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !question.trim()}>
          Send
        </button>
      </div>
    </main>
  );
}
