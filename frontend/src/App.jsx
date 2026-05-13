import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

const API = "http://127.0.0.1:8000";
const SESSION = "user_" + Math.random().toString(36).substr(2, 9);

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filename, setFilename] = useState("");
  const [questions, setQuestions] = useState([]);

  const clearChat = () => {
    setMessages([]);
    setUploaded(false);
    setFilename("");
    setQuestions([]);
    setInput("");
  };
  const fileRef = useRef();

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setFilename(file.name);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", SESSION);
    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      setUploaded(true);
      setQuestions(data.questions || []);
      setMessages([{
        role: "assistant",
        content: `✅ **${file.name}** uploaded!\n\n📋 **Summary:** ${data.summary}`
      }]);
    } catch (err) {
      setMessages([{
        role: "assistant",
        content: "❌ Upload failed! Make sure your file is a valid PDF under 10MB."
      }]);
    }
    setUploading(false);
  };

  const sendMessage = async (text) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");
    setQuestions([]);
    setLoading(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_id: SESSION }),
      });
      const data = await res.json();
      const sources = data.sources?.length
        ? `\n\n📄 *Sources: Page ${data.sources.join(", ")}*`
        : "";
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply + sources
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "❌ Something went wrong. Check your connection and try again!"
      }]);
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "#0D0D0D", color: "#E8E4DD", fontFamily: "Georgia, serif"
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px", borderBottom: "1px solid #1E1E28",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#111116"
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#00C9A7" }}>ContextIQ</div>
          <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>
            AI Document Intelligence
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {uploaded && (
            <button
              onClick={clearChat}
              style={{
                background: "transparent",
                color: "#555",
                border: "1px solid #2A2A34",
                padding: "8px 16px", borderRadius: 6,
                cursor: "pointer", fontFamily: "monospace",
                fontSize: 12
              }}
            >
              Clear
            </button>
          )}
          <input
            type="file"
            accept=".pdf"
            ref={fileRef}
            onChange={uploadFile}
            style={{ display: "none" }}
          />
          
          <button
            onClick={() => fileRef.current.click()}
            style={{
              background: uploaded ? "#00C9A722" : "#00C9A7",
              color: uploaded ? "#00C9A7" : "#000",
              border: uploaded ? "1px solid #00C9A7" : "none",
              padding: "8px 16px", borderRadius: 6,
              cursor: "pointer", fontFamily: "monospace",
              fontSize: 12, fontWeight: 700
            }}
          >
            {uploading ? "Uploading..." : uploaded ? `📄 ${filename}` : "Upload PDF"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "24px 16px",
        display: "flex", flexDirection: "column", gap: 16,
        maxWidth: 800, width: "100%", margin: "0 auto"
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 80, color: "#444" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <div style={{ fontSize: 18, color: "#666" }}>Upload a PDF to get started</div>
            <div style={{ fontSize: 13, color: "#444", marginTop: 8, fontFamily: "monospace" }}>
              Then ask anything about it
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
          }}>
            <div style={{
              maxWidth: "75%", padding: "12px 16px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? "#00C9A7" : "#1A1A24",
              color: msg.role === "user" ? "#000" : "#E8E4DD",
              fontSize: 14, lineHeight: 1.7,
              border: msg.role === "assistant" ? "1px solid #2A2A34" : "none"
            }}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "12px 16px", background: "#1A1A24",
              borderRadius: "16px 16px 16px 4px",
              border: "1px solid #2A2A34", color: "#555",
              fontFamily: "monospace", fontSize: 13
            }}>
              thinking...
            </div>
          </div>
        )}

        {/* Suggested Questions */}
        {questions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace", letterSpacing: 2 }}>
              SUGGESTED QUESTIONS
            </div>
            {questions.map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)} style={{
                background: "#1A1A24", border: "1px solid #2A2A34",
                borderRadius: 8, padding: "10px 14px",
                color: "#00C9A7", cursor: "pointer",
                fontSize: 13, textAlign: "left",
                fontFamily: "Georgia, serif",
                transition: "all 0.2s"
              }}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "16px", borderTop: "1px solid #1E1E28", background: "#111116" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder={uploaded ? "Ask anything about your document..." : "Upload a PDF first..."}
            disabled={!uploaded || loading}
            style={{
              flex: 1, padding: "12px 16px",
              background: "#1A1A24", border: "1px solid #2A2A34",
              borderRadius: 8, color: "#E8E4DD",
              fontSize: 14, fontFamily: "Georgia, serif", outline: "none"
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!uploaded || loading || !input.trim()}
            style={{
              padding: "12px 20px",
              background: uploaded && input.trim() ? "#00C9A7" : "#1A1A24",
              color: uploaded && input.trim() ? "#000" : "#444",
              border: "none", borderRadius: 8,
              cursor: "pointer", fontWeight: 700,
              fontSize: 16, transition: "all 0.2s"
            }}
          >→</button>
        </div>
      </div>
    </div>
  );
}