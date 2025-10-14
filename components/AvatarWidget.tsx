"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Keyboard, Send, Volume2, Slash, X } from "lucide-react";

/**
 * AvatarWidget - Voice-first mascot UI with:
 * - Floating mascot that listens & speaks
 * - Chat modal (full history + composer) opened by keyboard icon
 * - Listening visual (animated rings) while speech recognition active
 *
 * TypeScript-safe: avatarRef typed as HTMLButtonElement to avoid ref errors
 */

/* ---------- types ---------- */
type Product = { id: number; title: string; price: string; handle?: string; variant_id?: number; checkoutUrl?: string; };
type Message = { id: string; text: string; sender: "user" | "assistant"; time: string; audioUrl?: string; };

/* ---------- env / constants ---------- */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const SHOP = process.env.NEXT_PUBLIC_SHOP || "demo-shop.myshopify.com";

/* ---------- mascots ---------- */
const MASCOTS = [
  { id: "sunny", name: "Sunny", mouthAnchor: { x: 0.5, y: 0.64 }, svg: (p: any) => (<svg viewBox="0 0 96 96" {...p}><circle cx="48" cy="44" r="34" fill="#FFD580"/><circle cx="36" cy="40" r="3" fill="#111"/><circle cx="60" cy="40" r="3" fill="#111"/><path d="M30 60 Q48 68 66 60" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round"/></svg>)},
  { id: "bubbles", name: "Bubbles", mouthAnchor: { x: 0.5, y: 0.66 }, svg: (p: any) => (<svg viewBox="0 0 96 96" {...p}><circle cx="48" cy="42" r="34" fill="#A7F3D0"/><rect x="28" y="36" rx="3" width="12" height="6" fill="#111"/><rect x="56" y="36" rx="3" width="6" height="6" fill="#111"/><path d="M34 68 Q48 62 62 68" stroke="#111" strokeWidth="3" fill="none"/></svg>)},
  { id: "pixel", name: "Pixel", mouthAnchor: { x: 0.5, y: 0.6 }, svg: (p: any) => (<svg viewBox="0 0 96 96" {...p}><rect x="12" y="14" width="72" height="72" rx="14" fill="#E0E7FF"/><circle cx="36" cy="44" r="3" fill="#111"/><circle cx="60" cy="44" r="3" fill="#111"/><path d="M30 64 Q48 70 66 64" stroke="#111" strokeWidth="3" fill="none"/></svg>)},
  { id: "flare", name: "Flare", mouthAnchor: { x: 0.55, y: 0.62 }, svg: (p: any) => (<svg viewBox="0 0 96 96" {...p}><polygon points="48,10 76,40 60,80 36,80 20,40" fill="#FFE4E6"/><circle cx="36" cy="44" r="3" fill="#111"/><circle cx="60" cy="44" r="3" fill="#111"/><path d="M32 66 Q48 72 64 66" stroke="#111" strokeWidth="3" fill="none"/></svg>)},
  { id: "orbit", name: "Orbit", mouthAnchor: { x: 0.5, y: 0.63 }, svg: (p: any) => (<svg viewBox="0 0 96 96" {...p}><circle cx="48" cy="44" r="34" fill="#DBEAFE"/><ellipse cx="36" cy="40" rx="3" ry="3" fill="#111"/><ellipse cx="60" cy="40" rx="3" ry="3" fill="#111"/><path d="M38 68 Q48 60 58 68" stroke="#111" strokeWidth="3" fill="none"/></svg>)},
];

/* ---------- utils ---------- */
function speakText(text?: string, lang = "en-US") {
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
export default function AvatarWidget() {
  const [selectedMascot, setSelectedMascot] = useState<string>(() => (typeof window !== "undefined" && localStorage.getItem("avatar.mascot")) || "sunny");
  const [muted, setMuted] = useState<boolean>(() => (typeof window !== "undefined" && localStorage.getItem("avatar.muted") === "true") || false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [listening, setListening] = useState<boolean>(false);
  const [chatModalOpen, setChatModalOpen] = useState<boolean>(false);
  const [composerText, setComposerText] = useState<string>("");
  const [lastAssistantText, setLastAssistantText] = useState<string | null>(null);
  const [lastAssistantAudio, setLastAssistantAudio] = useState<string | null>(null);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [mockMode] = useState<boolean>(() => !API_URL);

  // Refs
  const avatarRef = useRef<HTMLButtonElement | null>(null); // correct type for button ref
  const speechRecRef = useRef<any>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("avatar.mascot", selectedMascot);
  }, [selectedMascot]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("avatar.muted", muted ? "true" : "false");
  }, [muted]);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const greeting = "Hello — tap me to speak, or open the keyboard to type.";
    pushMessage({ id: `m-${Date.now()}`, text: greeting, sender: "assistant", time: new Date().toISOString() });
    setLastAssistantText(greeting);
    if (!muted) speakText(greeting);
  }, []); // eslint-disable-line

  function pushMessage(m: Message) {
    setMessages((s) => [...s, m]);
  }

  function getMouthPos() {
    const m = MASCOTS.find((x) => x.id === selectedMascot) || MASCOTS[0];
    const anchor = m.mouthAnchor || { x: 0.5, y: 0.6 };
    const el = avatarRef.current;
    if (!el) return { left: 48, top: 28 };
    const rect = el.getBoundingClientRect();
    return { left: rect.left + rect.width * anchor.x, top: rect.top + rect.height * anchor.y };
  }

  /* ---------- speech recognition ---------- */
  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Use Chrome or Edge.");
      return;
    }
    try {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = async (e: any) => {
        const transcript = e.results[0][0].transcript;
        pushMessage({ id: `u-${Date.now()}`, text: transcript, sender: "user", time: new Date().toISOString() });
        await handleSend(transcript);
      };
      rec.onerror = (err: any) => {
        console.error("Speech error", err);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      rec.start();
      speechRecRef.current = rec;
      setListening(true);
    } catch (e) {
      console.error("startListening failed", e);
    }
  };

  const stopListening = () => {
    try {
      if (speechRecRef.current) speechRecRef.current.stop();
    } catch (e) {}
    speechRecRef.current = null;
    setListening(false);
  };

  /* ---------- backend or mock ---------- */
  async function callBackend(message: string) {
    if (mockMode) return await mockReply(message);
    try {
      const payload = { shop: SHOP, message, history: messages.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })) };
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(API_KEY ? { "x-api-key": API_KEY } : {}) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "error");
        throw new Error(t);
      }
      const data = await res.json();
      const answer = data.text || "I don't have an answer right now.";
      pushMessage({ id: `m-${Date.now()}`, text: answer, sender: "assistant", time: new Date().toISOString(), audioUrl: data.speech_url || undefined });
      setLastAssistantText(answer);
      setLastAssistantAudio(data.speech_url || null);
      setRecommended(data.recommended_products || []);
      if (!muted) {
        if (data.speech_url) {
          const a = new Audio(data.speech_url);
          a.play().catch(() => speakText(answer));
        } else {
          speakText(answer);
        }
      }
      return;
    } catch (err) {
      console.error("callBackend error", err);
      pushMessage({ id: `m-${Date.now()}`, text: "Sorry — couldn't reach server.", sender: "assistant", time: new Date().toISOString() });
      setLastAssistantText("Sorry — couldn't reach server.");
      if (!muted) speakText("Sorry — couldn't reach server.");
    }
  }

  async function mockReply(message: string) {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 700));
    const lower = message.toLowerCase();
    let reply = "Got it — I have a few recommendations coming right up.";
    let prods: Product[] = [];
    if (lower.includes("headphone")) {
      reply = "Our Premium Wireless Headphones are a top pick.";
      prods = [{ id: 1, title: "Premium Wireless Headphones", price: "$129.99", handle: "wireless-headphones", variant_id: 111 }];
    } else if (lower.includes("fitness")) {
      reply = "Check the Smart Fitness Tracker with long battery life.";
      prods = [{ id: 2, title: "Smart Fitness Tracker", price: "$89.99", handle: "fitness-tracker", variant_id: 222 }];
    }
    pushMessage({ id: `m-${Date.now()}`, text: reply, sender: "assistant", time: new Date().toISOString() });
    setLastAssistantText(reply);
    setLastAssistantAudio(null);
    setRecommended(prods);
    if (!muted) speakText(reply);
  }

  // unified send handler
  async function handleSend(textOverride?: string) {
    const text = ((textOverride ?? "") || "").trim();
    if (!text) return;
    if (!messages.some((m) => m.sender === "user" && m.text === text)) {
      pushMessage({ id: `u-${Date.now()}`, text, sender: "user", time: new Date().toISOString() });
    }
    setComposerText("");
    setChatModalOpen(false);
    await callBackend(text);
  }

  function handleAddToCart(p: Product) {
    pushMessage({ id: `c-${Date.now()}`, text: `${p.title} added to cart.`, sender: "assistant", time: new Date().toISOString() });
    // production: call server-side shopify add-to-cart
  }

  const selected = MASCOTS.find((m) => m.id === selectedMascot) || MASCOTS[0];

  return (
    <>
      {/* Floating mascot + keyboard */}
      <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 9999, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => setChatModalOpen(true)}
          title="Open chat"
          style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.95)", boxShadow: "0 6px 18px rgba(2,6,23,0.12)", border: "none", cursor: "pointer" }}
        >
          <Keyboard />
        </button>

        <div style={{ position: "relative", width: 92, height: 92 }}>
          <AnimatePresence>
            {listening && (
              <motion.div
                key="rings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: "absolute", left: -8, top: -8, width: 108, height: 108, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}
              >
                <div style={{ position: "relative", width: 96, height: 96 }}>
                  <div className="ring ring-1" />
                  <div className="ring ring-2" />
                  <div className="ring ring-3" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            ref={avatarRef}
            onClick={() => {
              if (listening) stopListening();
              else startListening();
            }}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.03 }}
            style={{ width: 92, height: 92, borderRadius: 20, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.25)", cursor: "pointer" }}
            title={listening ? "Listening... click to stop" : "Click to speak"}
          >
            <div style={{ width: 72, height: 72, borderRadius: 16, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 64, height: 64 }}>{selected.svg({ width: 64, height: 64 })}</div>
            </div>
          </motion.button>

          <div style={{ position: "absolute", right: -6, bottom: -6 }}>
            <button onClick={() => setMuted((s) => !s)} title={muted ? "Unmute" : "Mute"} style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: "#fff", boxShadow: "0 6px 14px rgba(2,6,23,0.12)", cursor: "pointer" }}>
              {muted ? <Slash /> : <Volume2 />}
            </button>
          </div>
        </div>
      </div>

      {/* Assistant speech bubble (near mascot) */}
      <AnimatePresence>
        {lastAssistantText && (
          <motion.div
            key="assist-bubble"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            style={{
              position: "fixed",
              right: 24 + 92 + 12,
              bottom: 24 + 40,
              zIndex: 9998,
              width: 300,
            }}
          >
            <div style={{ background: "linear-gradient(180deg,#ffffff,#f8fafc)", padding: 12, borderRadius: 12, boxShadow: "0 10px 30px rgba(2,6,23,0.15)", fontSize: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Moxi</div>
              <div style={{ color: "#0f172a" }}>{lastAssistantText}</div>
              {lastAssistantAudio && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => { const a = new Audio(lastAssistantAudio); a.play().catch(()=>{}); }} style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff" }}>Play audio</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat modal */}
      <AnimatePresence>
        {chatModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{ position: "fixed", right: 24, bottom: 140, zIndex: 10000 }}
          >
            <div style={{ width: 420, borderRadius: 12, boxShadow: "0 12px 38px rgba(2,6,23,0.28)", overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>{selected.svg({ width: 32, height: 32 })}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>Chat with Moxi</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Voice-first assistant — type or speak</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={selectedMascot} onChange={(e) => setSelectedMascot(e.target.value)} style={{ padding: "6px 8px", borderRadius: 8 }}>
                    {MASCOTS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <button onClick={() => setChatModalOpen(false)} style={{ border: "none", background: "transparent", cursor: "pointer" }}><X /></button>
                </div>
              </div>

              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, width: "100%" }}>
                <div style={{ overflow: "auto", maxHeight: 220 }}>
                  {messages.map((m) => (
                    <div key={m.id} style={{ display: "flex", justifyContent: m.sender === "user" ? "flex-end" : "flex-start", padding: "6px 0" }}>
                      <div style={{ maxWidth: "78%" }}>
                        <div style={{
                          display: "inline-block",
                          background: m.sender === "user" ? "#4f46e5" : "#fff",
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
                </div>

                {recommended.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Recommended for you</div>
                    <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                      {recommended.map((p) => (
                        <div key={p.id} style={{ minWidth: 160, background: "#f8fafc", padding: 8, borderRadius: 8 }}>
                          <div style={{ fontWeight: 600 }}>{p.title}</div>
                          <div style={{ color: "#6b7280", marginBottom: 8 }}>{p.price}</div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => (window.location.href = `/products/${p.handle}`)} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)", background: "#fff" }}>View</button>
                            <button onClick={() => handleAddToCart(p)} style={{ padding: "6px 8px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff" }}>Add</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    placeholder="Type your message or press Send..."
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSend(composerText); }}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)" }}
                  />
                  <button onClick={() => handleSend(composerText)} style={{ padding: "10px 12px", borderRadius: 10, background: "#4f46e5", color: "white", border: "none" }}>
                    <Send />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* small scoped CSS */}
      <style jsx>{`
        .ring {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%,-50%);
          border-radius: 999px;
          border: 2px solid rgba(99,102,241,0.12);
          box-shadow: 0 12px 30px rgba(99,102,241,0.06);
          animation: ringScale 1.8s infinite ease-in-out;
        }
        .ring-1 { width: 96px; height: 96px; animation-delay: 0s; }
        .ring-2 { width: 72px; height: 72px; animation-delay: 0.2s; opacity: 0.85; }
        .ring-3 { width: 48px; height: 48px; animation-delay: 0.4s; opacity: 0.6; }
        @keyframes ringScale {
          0% { transform: translate(-50%,-50%) scale(0.9); opacity: 0.9; }
          50% { transform: translate(-50%,-50%) scale(1.05); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(0.9); opacity: 0.3; }
        }
        button:focus { outline: none; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); border-radius: 8px; }
      `}</style>
    </>
  );
}
