"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Mic,
  Volume2,
  Send,
  Maximize2,
  ShoppingCart,
  Settings,
  Upload,
  Slash,
} from "lucide-react";

/**
 * AvatarWidget.tsx
 * - Full-featured futuristic mascot assistant
 * - Replace components/AvatarWidget.tsx with this file content
 *
 * Notes:
 * - Requires framer-motion and lucide-react (you already use these)
 * - Uses NEXT_PUBLIC_API_URL and NEXT_PUBLIC_API_KEY for real backend (if provided)
 * - If no API_URL, runs in MOCK mode
 */

/* ---------- types ---------- */
type Product = {
  id: number;
  title: string;
  price: string;
  handle?: string;
  variant_id?: number;
  checkoutUrl?: string;
};

type Message = {
  id: string;
  text: string;
  sender: "user" | "assistant";
  time: string;
  type?: "general" | "store";
  audioUrl?: string;
};

/* ---------- env / constants ---------- */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const SHOP = process.env.NEXT_PUBLIC_SHOP || "demo-shop.myshopify.com";

/* ---------- mascots (5) ---------- */
const MASCOTS = [
  {
    id: "sunny",
    name: "Sunny",
    mouthAnchor: { x: 0.53, y: 0.62 },
    svg: (props: any) => (
      <svg viewBox="0 0 96 96" {...props}>
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#FCA5A5" />
          </linearGradient>
        </defs>
        <circle cx="48" cy="44" r="34" fill="url(#g1)" stroke="#F97316" strokeWidth="2" />
        <ellipse cx="36" cy="40" rx="3" ry="3" fill="#111827" />
        <ellipse cx="60" cy="40" rx="3" ry="3" fill="#111827" />
        <path d="M30 60 Q48 68 66 60" stroke="#111827" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "bubbles",
    name: "Bubbles",
    mouthAnchor: { x: 0.5, y: 0.66 },
    svg: (props: any) => (
      <svg viewBox="0 0 96 96" {...props}>
        <circle cx="48" cy="42" r="34" fill="#A7F3D0" stroke="#10B981" strokeWidth="2" />
        <rect x="28" y="36" rx="3" width="12" height="6" fill="#111827" />
        <rect x="56" y="36" rx="3" width="6" height="6" fill="#111827" />
        <path d="M34 68 Q48 62 62 68" stroke="#111827" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "pixel",
    name: "Pixel",
    mouthAnchor: { x: 0.5, y: 0.6 },
    svg: (props: any) => (
      <svg viewBox="0 0 96 96" {...props}>
        <rect x="12" y="14" width="72" height="72" rx="14" fill="#E0E7FF" stroke="#4338CA" strokeWidth="2" />
        <circle cx="36" cy="44" r="3" fill="#111827" />
        <circle cx="60" cy="44" r="3" fill="#111827" />
        <path d="M30 64 Q48 70 66 64" stroke="#111827" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "flare",
    name: "Flare",
    mouthAnchor: { x: 0.55, y: 0.62 },
    svg: (props: any) => (
      <svg viewBox="0 0 96 96" {...props}>
        <polygon points="48,10 76,40 60,80 36,80 20,40" fill="#FFE4E6" stroke="#FB7185" strokeWidth="2" />
        <circle cx="36" cy="44" r="3" fill="#111827" />
        <circle cx="60" cy="44" r="3" fill="#111827" />
        <path d="M32 66 Q48 72 64 66" stroke="#111827" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "orbit",
    name: "Orbit",
    mouthAnchor: { x: 0.5, y: 0.63 },
    svg: (props: any) => (
      <svg viewBox="0 0 96 96" {...props}>
        <circle cx="48" cy="44" r="34" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
        <ellipse cx="36" cy="40" rx="3" ry="3" fill="#111827" />
        <ellipse cx="60" cy="40" rx="3" ry="3" fill="#111827" />
        <path d="M38 68 Q48 60 58 68" stroke="#111827" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
];

/* ---------- utility: speak TTS ---------- */
function speakText(text: string | undefined, lang = "en-US") {
  if (!text) return false;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) {
      console.warn("TTS failed", e);
    }
  }
  return false;
}

/* ---------- component ---------- */
export default function AvatarWidgetFuturistic() {
  const [open, setOpen] = useState<boolean>(() => (localStorage.getItem("avatar.open") ? localStorage.getItem("avatar.open") === "true" : true));
  const [muted, setMuted] = useState<boolean>(() => localStorage.getItem("avatar.muted") === "true");
  const [voiceMode, setVoiceMode] = useState<"text" | "voice">(() => ((localStorage.getItem("avatar.voiceMode") as any) || "text"));
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState<boolean>(false);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mockMode] = useState<boolean>(!API_URL);
  const [selectedMascot, setSelectedMascot] = useState<string>(() => localStorage.getItem("avatar.mascot") || MASCOTS[0].id);
  const [expression, setExpression] = useState<string>("neutral");
  const [listening, setListening] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const avatarWrapRef = useRef<HTMLDivElement | null>(null);
  const speechRecRef = useRef<any>(null);
  const idCounter = useRef<number>(1);

  useEffect(() => {
    localStorage.setItem("avatar.mascot", selectedMascot);
  }, [selectedMascot]);
  useEffect(() => {
    localStorage.setItem("avatar.open", open ? "true" : "false");
  }, [open]);
  useEffect(() => {
    localStorage.setItem("avatar.muted", muted ? "true" : "false");
  }, [muted]);
  useEffect(() => {
    localStorage.setItem("avatar.voiceMode", voiceMode);
  }, [voiceMode]);

  useEffect(() => {
    // initial greeting
    const welcome: Message = {
      id: `m-${Date.now()}`,
      text: "Hello — I’m your AI shopping avatar. Ask me anything about the store.",
      sender: "assistant",
      time: new Date().toISOString(),
      type: "general",
    };
    setMessages([welcome]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, recommended, videoUrl]);

  /* ---------- helpers ---------- */
  function pushMessage(msg: Message) {
    setMessages((p) => [...p, msg]);
  }

  function decideExpressionFromText(text: string) {
    const t = (text || "").toLowerCase();
    if (/\b(thank|great|nice|love|awesome|good|yay)\b/.test(t)) return "happy";
    if (/\b(error|not work|fail|problem|sorry|can't)\b/.test(t)) return "sad";
    if (/\b(wait|hold|loading|thinking|processing)\b/.test(t)) return "thinking";
    return "neutral";
  }

  /* ---------- speech recognition (voice input) ---------- */
  const startListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };
    rec.onerror = (e: any) => {
      console.error("Speech rec error", e);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
    speechRecRef.current = rec;
  };

  const stopListening = () => {
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch (e) {}
      speechRecRef.current = null;
    }
    setListening(false);
  };

  /* ---------- mock reply (if no backend) ---------- */
  async function mockReply(userText: string) {
    setTyping(true);
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 700));
    const lower = userText.toLowerCase();
    let reply = "I can help with products, shipping, returns, and personalized suggestions. What do you want?";
    let prods: Product[] = [];
    if (lower.includes("headphone") || lower.includes("headset")) {
      reply = "Our Premium Wireless Headphones have active noise-cancellation and 30hr battery life.";
      prods = [{ id: 1, title: "Premium Wireless Headphones", price: "$129.99", handle: "wireless-headphones", variant_id: 111 }];
    } else if (lower.includes("fitness") || lower.includes("tracker")) {
      reply = "The Smart Fitness Tracker monitors heart rate, steps, and sleep — great for daily fitness.";
      prods = [{ id: 2, title: "Smart Fitness Tracker", price: "$89.99", handle: "fitness-tracker", variant_id: 222 }];
    } else {
      const variants = [
        "Nice choice — I can find the perfect match for your needs.",
        "On it — scanning the shop for best options.",
        "Hmm — I have a few recommendations coming right up.",
      ];
      reply = variants[Math.floor(Math.random() * variants.length)];
      prods = [
        { id: 1, title: "Premium Wireless Headphones", price: "$129.99", handle: "wireless-headphones", variant_id: 111 },
        { id: 3, title: "Portable Bluetooth Speaker", price: "$79.99", handle: "bluetooth-speaker", variant_id: 333 },
      ].slice(0, 2);
    }

    const assistantMsg: Message = { id: `m-${Date.now()}`, text: reply, sender: "assistant", time: new Date().toISOString(), type: "store" };
    pushMessage(assistantMsg);
    setRecommended(prods);
    setTyping(false);

    const expr = decideExpressionFromText(reply);
    setExpression(expr);

    // voice play (TTS)
    if (voiceMode === "voice" && !muted) {
      speakText(reply, "en-US");
    }

    // no mock video by default
    setVideoUrl(null);
  }

  /* ---------- backend call ---------- */
  async function callBackend(shop: string, message: string) {
    setTyping(true);
    try {
      const history = messages.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));
      const payload = { shop, message, history };
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(API_KEY ? { "x-api-key": API_KEY } : {}) },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "error");
        throw new Error(text);
      }
      const data = await resp.json();
      const assistantText: string = data.text || "No response";
      const assistantMsg: Message = { id: `m-${Date.now()}`, text: assistantText, sender: "assistant", time: new Date().toISOString(), audioUrl: data.speech_url || undefined };
      pushMessage(assistantMsg);

      setRecommended(data.recommended_products || []);
      setVideoUrl(data.avatar_video_url || null);

      const expr = data.expression || decideExpressionFromText(assistantText);
      setExpression(expr);

      // play audio: prefer backend speech_url, else fallback to TTS
      if (voiceMode === "voice" && !muted) {
        if (data.speech_url) {
          const audio = new Audio(data.speech_url);
          audio.play().catch(() => {
            speakText(assistantText);
          });
        } else {
          speakText(assistantText);
        }
      }
    } catch (err) {
      console.error("backend error", err);
      const assistantMsg: Message = { id: `m-${Date.now()}`, text: "Sorry, I couldn't reach the server.", sender: "assistant", time: new Date().toISOString() };
      pushMessage(assistantMsg);
    } finally {
      setTyping(false);
    }
  }

  /* ---------- unified send handler (type or speak) ---------- */
  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input || "").trim();
    if (!text) return;
    const userMsg: Message = { id: `u-${Date.now()}`, text, sender: "user", time: new Date().toISOString() };
    pushMessage(userMsg);
    setInput("");
    setRecommended([]);
    setExpression("listening");

    if (mockMode) {
      await mockReply(text);
    } else {
      await callBackend(SHOP, text);
    }
  }

  /* ---------- avatar upload preview ---------- */
  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  }

  /* ---------- add to cart ---------- */
  function handleAddToCart(p: Product) {
    // For demo: show message and optionally redirect or call your proxy
    pushMessage({ id: `c-${Date.now()}`, text: `${p.title} has been added to your cart.`, sender: "assistant", time: new Date().toISOString(), type: "store" });
    // Real implementation: call /api/shopify-add-to-cart serverless to create checkout or add to cart
    // fetch('/api/shopify-add-to-cart', { method: 'POST', body: JSON.stringify({ variantId: p.variant_id, qty:1 }) })
  }

  /* ---------- compute mouth position for speech bubble ---------- */
  function getMouthPosition() {
    const m = MASCOTS.find((x) => x.id === selectedMascot);
    const anchor = m?.mouthAnchor || { x: 0.5, y: 0.6 };
    const el = avatarWrapRef.current;
    if (!el) return { left: 60, top: 8 };
    const rect = el.getBoundingClientRect();
    const left = rect.width * anchor.x;
    const top = rect.height * anchor.y;
    return { left, top };
  }

  /* ---------- small UI helpers ---------- */
  const selected = MASCOTS.find((m) => m.id === selectedMascot) || MASCOTS[0];
  const mouthPos = getMouthPosition();

  /* ---------- render ---------- */
  return (
    <>
      <AnimatePresence>
        {/* Minimized bubble */}
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fut-bubble"
            aria-label="Open assistant"
            title="Open assistant"
            style={{ position: "fixed", right: 24, bottom: 24, zIndex: 9999 }}
          >
            <div className="fut-bubble-inner">
              <div className="avatar-ring">
                <div style={{ width: 44, height: 44 }}>{selected.svg({ width: 44, height: 44 })}</div>
              </div>
              <div className="pulse-dot" />
            </div>
          </motion.button>
        )}

        {/* Full panel */}
        {open && (
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fut-panel"
            role="dialog"
            aria-label="Shopping assistant"
            style={{
              position: "fixed",
              right: 24,
              bottom: 24,
              zIndex: 9999,
              width: 420,
              borderRadius: 18,
              boxShadow: "0 10px 30px rgba(2,6,23,0.35)",
              overflow: "hidden",
              display: "flex",
              background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96))",
            }}
          >
            {/* Left: avatar stage */}
            <div style={{ width: 160, padding: 12, borderRight: "1px solid rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div ref={avatarWrapRef} style={{ width: 64, height: 64, borderRadius: 14, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#eef2ff, #fff)" }}>
                    {avatarPreview ? <img src={avatarPreview} alt="avatar" style={{ width: 64, height: 64, objectFit: "cover" }} /> : selected.svg({ width: 64, height: 64 })}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>AcademicTechnexus</div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button className={`icon-btn ${muted ? "muted" : ""}`} onClick={() => setMuted((s) => !s)} title={muted ? "Unmute" : "Mute"}>
                    {muted ? <Slash /> : <Volume2 />}
                  </button>
                  <label style={{ display: "inline-block" }} title="Upload avatar">
                    <input onChange={handleAvatarUpload} accept="image/*" type="file" style={{ display: "none" }} />
                    <button className="icon-btn" title="Upload avatar"><Upload /></button>
                  </label>
                  <button className="icon-btn" onClick={() => setOpen(false)} title="Minimize"><Maximize2 /></button>
                </div>
              </div>

              {/* avatar stage / video */}
              <div ref={stageRef} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {videoUrl ? (
                  <video src={videoUrl} autoPlay playsInline muted={muted} style={{ width: "100%", borderRadius: 12 }} />
                ) : (
                  <motion.div
                    animate={expression === "happy" ? { rotate: [0, 6, -6, 0] } : expression === "thinking" ? { scale: [1, 0.98, 1] } : { rotate: 0 }}
                    transition={{ type: "spring", stiffness: 80, damping: 10 }}
                    style={{ width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {selected.svg({ width: 96, height: 96 })}
                  </motion.div>
                )}

                {/* speech bubble from mouth for last assistant message */}
                <AnimatePresence>
                  {messages.length > 0 && messages[messages.length - 1].sender === "assistant" && (
                    <motion.div
                      key={`bubble-${messages[messages.length - 1].id}`}
                      initial={{ opacity: 0, y: 8, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.85 }}
                      style={{
                        position: "absolute",
                        left: mouthPos.left - 80,
                        top: mouthPos.top - 40,
                        width: 160,
                        pointerEvents: "auto",
                      }}
                    >
                      <div style={{ background: "white", padding: "8px 10px", borderRadius: 14, boxShadow: "0 6px 18px rgba(2,6,23,0.15)", fontSize: 13 }}>
                        {messages[messages.length - 1].text}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Mascot</div>
                <select value={selectedMascot} onChange={(e) => setSelectedMascot(e.target.value)} style={{ padding: "6px 8px", borderRadius: 8 }}>
                  {MASCOTS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {/* Right: chat & composer */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 360 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Shopping Assistant</h3>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>How can I help today?</div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setVoiceMode("text")} className={`small-btn ${voiceMode === "text" ? "active" : ""}`} style={{ padding: "6px 8px", borderRadius: 8 }}>Text</button>
                  <button onClick={() => setVoiceMode("voice")} className={`small-btn ${voiceMode === "voice" ? "active" : ""}`} style={{ padding: "6px 8px", borderRadius: 8 }}>Voice</button>
                </div>
              </div>

              <div style={{ padding: 12, flex: 1, display: "flex", gap: 12 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div className="messages-scroll" style={{ overflow: "auto", paddingRight: 8 }}>
                    {messages.map((m) => (
                      <div key={m.id} style={{ display: "flex", marginBottom: 10, alignItems: "flex-end", gap: 8, justifyContent: m.sender === "user" ? "flex-end" : "flex-start" }}>
                        {m.sender === "assistant" && <div style={{ width: 8 }} />}
                        <div style={{ maxWidth: "78%", textAlign: m.sender === "user" ? "right" : "left" }}>
                          <div style={{
                            display: "inline-block",
                            background: m.sender === "user" ? "#3730a3" : "#fff",
                            color: m.sender === "user" ? "#fff" : "#0f172a",
                            padding: "8px 10px",
                            borderRadius: 12,
                            boxShadow: "0 6px 16px rgba(2,6,23,0.06)"
                          }}>
                            <div style={{ fontSize: 13 }}>{m.text}</div>
                          </div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{new Date(m.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      </div>
                    ))}

                    {typing && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <div style={{ width: 8 }} />
                        <div style={{ display: "inline-block", background: "#fff", padding: "8px 10px", borderRadius: 12 }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <div className="dot" style={{ width: 6, height: 6, borderRadius: "999px", background: "#cbd5e1", animation: "pulse 1s infinite" }} />
                            <div className="dot" style={{ width: 6, height: 6, borderRadius: "999px", background: "#cbd5e1", animation: "pulse 1s infinite", animationDelay: "0.12s" }} />
                            <div className="dot" style={{ width: 6, height: 6, borderRadius: "999px", background: "#cbd5e1", animation: "pulse 1s infinite", animationDelay: "0.24s" }} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* recommended */}
                  {recommended.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Recommended for you</div>
                      <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                        {recommended.map((p) => (
                          <div key={p.id} style={{ minWidth: 180, background: "#fff", borderRadius: 10, padding: 8, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
                            <div style={{ height: 72, background: "#f3f4f6", borderRadius: 8, marginBottom: 8 }} />
                            <div style={{ fontWeight: 600 }}>{p.title}</div>
                            <div style={{ color: "#6b7280", marginBottom: 8 }}>{p.price}</div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="outline-btn" onClick={() => (window.location.href = `/products/${p.handle}`)}>View</button>
                              <button className="primary-btn" onClick={() => handleAddToCart(p)} style={{ display: "flex", alignItems: "center", gap: 6 }}><ShoppingCart size={14} />Add</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* composer */}
              <div style={{ padding: 12, borderTop: "1px solid rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    placeholder="Ask about products, shipping, orders, or say 'recommend'..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)" }}
                  />
                  <button
                    onClick={() => {
                      if (voiceMode === "voice") {
                        if (listening) stopListening();
                        else startListening();
                      } else {
                        // if in text mode, toggle listening to voice input as convenience
                        if (!listening) startListening();
                        else stopListening();
                      }
                    }}
                    title="Speak"
                    style={{ padding: "10px 12px", borderRadius: 10, background: listening ? "#ef4444" : "#fff", border: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <Mic />
                  </button>
                  <button onClick={() => handleSend()} style={{ padding: "10px 12px", borderRadius: 10, background: "#4f46e5", color: "white" }}>
                    <Send />
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Powered by AcademicTechnexus AI</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="ghost-btn" onClick={() => { setMessages([]); setRecommended([]); }}>Clear</button>
                    <button className="ghost-btn" onClick={() => setAvatarPreview(null)}>Reset Avatar</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* small CSS tweaks (scoped) */}
      <style jsx>{`
        .icon-btn { background: transparent; border: none; padding: 8px; border-radius: 8px; cursor: pointer; }
        .icon-btn.muted { opacity: 0.6; }
        .fut-bubble { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 6px; background: linear-gradient(135deg,#7c3aed,#06b6d4); color: #fff; border: none; cursor: pointer; }
        .fut-bubble .avatar-ring { width: 44px; height: 44px; border-radius: 999px; display:flex; align-items:center; justify-content:center; background: rgba(255,255,255,0.12); }
        .fut-panel { font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
        .small-btn { border: 1px solid rgba(15,23,42,0.06); background: white; cursor: pointer; }
        .small-btn.active { background: #eef2ff; border-color: #c7d2fe; }
        .dot { display:inline-block; }
        .outline-btn { padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(15,23,42,0.06); background: white; cursor: pointer; }
        .primary-btn { padding: 6px 8px; border-radius: 8px; border: none; background: #4f46e5; color: white; cursor: pointer; }
        @keyframes pulse { 0% { opacity: 0.4; transform: translateY(0) } 50% { opacity: 1; transform: translateY(-4px) } 100% { opacity: 0.4; transform: translateY(0) } }
      `}</style>
    </>
  );
}
