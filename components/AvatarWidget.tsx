"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Mic, Volume2, Send, Maximize2, ShoppingCart, Settings, Upload, Slash } from "lucide-react";

/**
 * Futuristic Avatar Widget (AI Avatar with Floating Video Head)
 * - Place this file at components/AvatarWidget.tsx
 * - Requires: framer-motion, lucide-react
 * - Styling: add the CSS block below to styles/globals.css
 *
 * Behavior:
 * - Uses NEXT_PUBLIC_API_URL && NEXT_PUBLIC_API_KEY to call actual backend.
 * - If API_URL is missing, runs in MOCK mode (interactive demo replies).
 * - Upload avatar: previews image (client-side). If backend provides avatar_video_url, plays video.
 * - Mute toggles voice output.
 */

type Product = { id: number; title: string; price: string; handle?: string; variant_id?: number };

type Message = {
  id: string;
  text: string;
  sender: "user" | "assistant";
  time: string;
  type?: "general" | "store";
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const SHOP = process.env.NEXT_PUBLIC_SHOP || "demo-shop.myshopify.com";

const FUTURE_COLORS = {
  accentA: "linear-gradient(135deg,#6c5ce7 0%,#00b0ff 100%)",
  glass: "rgba(255,255,255,0.06)",
};

export default function AvatarWidgetFuturistic() {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"text" | "voice">("text");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mockMode] = useState(!API_URL); // true when no backend configured
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // welcome
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

  // helper: append message
  function pushMessage(msg: Message) {
    setMessages((p) => [...p, msg]);
  }

  // MOCK intelligent reply generator (futuristic persona)
  async function mockReply(userText: string) {
    setTyping(true);
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
    // simple keywords -> product demo
    const lower = userText.toLowerCase();
    let reply = "I can help with products, shipping, returns, and personalized suggestions. What do you want?";
    let prods: Product[] = [];
    if (lower.includes("headphone") || lower.includes("écouteur") || lower.includes("headset")) {
      reply = "Our Premium Wireless Headphones have active noise-cancellation and 30hr battery life.";
      prods = [{ id: 1, title: "Premium Wireless Headphones", price: "$129.99", handle: "wireless-headphones", variant_id: 111 }];
    } else if (lower.includes("fitness") || lower.includes("tracker")) {
      reply = "The Smart Fitness Tracker monitors heart rate, steps, and sleep — great for daily fitness.";
      prods = [{ id: 2, title: "Smart Fitness Tracker", price: "$89.99", handle: "fitness-tracker", variant_id: 222 }];
    } else if (lower.includes("speaker")) {
      reply = "The Portable Bluetooth Speaker offers 360° sound and is waterproof — ideal for outdoors.";
      prods = [{ id: 3, title: "Portable Bluetooth Speaker", price: "$79.99", handle: "bluetooth-speaker", variant_id: 333 }];
    } else if (lower.includes("news") || lower.includes("latest")) {
      reply = "I don't have live news access here — but I can fetch product updates or troubleshoot orders.";
    } else {
      // creative persona
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

    // Assistant message
    const assistantMsg: Message = { id: `m-${Date.now()}`, text: reply, sender: "assistant", time: new Date().toISOString(), type: "store" };
    pushMessage(assistantMsg);
    setRecommended(prods);
    setTyping(false);

    // speak if voiceMode and not muted
    if (voiceMode === "voice" && !muted && "speechSynthesis" in window) {
      const ut = new SpeechSynthesisUtterance(reply);
      ut.lang = "en-US";
      window.speechSynthesis.speak(ut);
    }

    // mock avatar video - small loop (use sample public mp4 if you want)
    // We won't create a heavy video here; keep null unless backend sends one.
    setVideoUrl(null);
  }

  // Actual backend call (if API_URL present)
  async function callBackend(shop: string, message: string) {
    setTyping(true);
    try {
      const history = messages.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));
      const payload = { shop, message, history };
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "error");
        throw new Error(text);
      }
      const data = await resp.json();
      const assistantMsg: Message = { id: `m-${Date.now()}`, text: data.text || "No response", sender: "assistant", time: new Date().toISOString() };
      pushMessage(assistantMsg);
      setRecommended(data.recommended_products || []);
      setVideoUrl(data.avatar_video_url || null);

      if (voiceMode === "voice" && !muted && data.speech_url) {
        // backend could return a speech audio url
        const audio = new Audio(data.speech_url);
        audio.play().catch(() => {});
      } else if (voiceMode === "voice" && !muted) {
        // fallback TTS
        if ("speechSynthesis" in window) {
          const ut = new SpeechSynthesisUtterance(data.text || assistantMsg.text);
          ut.lang = "en-US";
          window.speechSynthesis.speak(ut);
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

  // Unified send handler (uses mock if no backend)
  async function handleSend(msg?: string) {
    const text = (msg ?? input).trim();
    if (!text) return;
    // add user message
    const userMsg: Message = { id: `u-${Date.now()}`, text, sender: "user", time: new Date().toISOString() };
    pushMessage(userMsg);
    setInput("");
    setRecommended([]);
    if (mockMode) {
      await mockReply(text);
    } else {
      await callBackend(SHOP, text);
    }
  }

  // Avatar image upload (client-side preview)
  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  }

  // Add to cart stub (integrate with Shopify cart or Checkout)
  function handleAddToCart(p: Product) {
    pushMessage({ id: `c-${Date.now()}`, text: `${p.title} has been added to your cart.`, sender: "assistant", time: new Date().toISOString(), type: "store" });
    // For real stores: perform POST to /cart/add.js or create checkout link
    // window.location.href = `/cart/add?id=${p.variant_id}&quantity=1`
    // For demo: no-op
  }

  // quick UI variants for avatar float
  const avatarHead = avatarPreview ? (
    <img src={avatarPreview} alt="avatar" className="avatar-head" />
  ) : (
    <div className="avatar-fallback">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.2" stroke="white" strokeWidth="1.1" />
        <path d="M4 20c1.8-3.5 5.5-5 8-5s6.2 1.6 8 5" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {/* Floating minimized bubble */}
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fut-bubble"
            aria-label="Open assistant"
            title="Open assistant"
          >
            <div className="fut-bubble-inner">
              <div className="avatar-ring">{avatarHead}</div>
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
          >
            <div className="panel-left">
              <div className="avatar-video-area">
                <div className="avatar-topbar">
                  <div className="avatar-ring large">{avatarHead}</div>
                  <div className="avatar-controls">
                    <button className={`icon-btn ${muted ? "muted" : ""}`} onClick={() => setMuted((s) => !s)} title={muted ? "Unmute" : "Mute"}>
                      {muted ? <Slash /> : <Volume2 />}
                    </button>
                    <label className="icon-btn upload-label" title="Upload avatar">
                      <input onChange={handleAvatarUpload} accept="image/*" type="file" style={{ display: "none" }} />
                      <Upload />
                    </label>
                    <button className="icon-btn" onClick={() => setOpen(false)} title="Minimize">
                      <Maximize2 />
                    </button>
                  </div>
                </div>

                <div className="avatar-stage">
                  {videoUrl ? (
                    <video src={videoUrl} autoPlay playsInline muted={muted} className="avatar-video" />
                  ) : (
                    <div className="avatar-synth">{avatarHead}</div>
                  )}
                </div>

                <div className="avatar-brand">AcademicTechnexus • AI Avatar</div>
              </div>
            </div>

            <div className="panel-right">
              <div className="panel-header">
                <div>
                  <h3>Shopping Assistant</h3>
                  <p className="muted-txt">How can I help today?</p>
                </div>
                <div className="header-actions">
                  <div className="toggle-voice">
                    <button className={`small-btn ${voiceMode === "text" ? "active" : ""}`} onClick={() => setVoiceMode("text")}>
                      Text
                    </button>
                    <button className={`small-btn ${voiceMode === "voice" ? "active" : ""}`} onClick={() => setVoiceMode("voice")}>
                      Voice
                    </button>
                  </div>
                </div>
              </div>

              <div className="messages-area">
                <div className="messages-scroll">
                  {messages.map((m) => (
                    <div key={m.id} className={`message-row ${m.sender === "user" ? "user" : "assistant"}`}>
                      {m.sender === "assistant" && <div className="msg-avatar-mini">{/* small bot dot */}</div>}
                      <div className={`message-bubble ${m.sender === "user" ? "user-bubble" : "assist-bubble"}`}>
                        <div className="message-text">{m.text}</div>
                        <div className="message-time">{new Date(m.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  ))}

                  {typing && (
                    <div className="message-row assistant">
                      <div className="msg-avatar-mini" />
                      <div className="message-bubble assist-bubble typing">
                        <div className="dot"/> <div className="dot" style={{ animationDelay: "0.12s" }}/> <div className="dot" style={{ animationDelay: "0.24s" }}/>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* recommended products */}
                {recommended.length > 0 && (
                  <div className="recommended">
                    <div className="rec-title">Recommended for you</div>
                    <div className="rec-list">
                      {recommended.map((p) => (
                        <div className="rec-card" key={p.id}>
                          <div className="rec-left">
                            <div className="rec-thumb" />
                            <div>
                              <div className="rec-name">{p.title}</div>
                              <div className="rec-price">{p.price}</div>
                            </div>
                          </div>
                          <div className="rec-actions">
                            <button className="outline-btn" onClick={() => (window.location.href = `/products/${p.handle}`)}>View</button>
                            <button className="primary-btn" onClick={() => handleAddToCart(p)}><ShoppingCart size={14}/> Add</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="composer">
                <div className="input-wrap">
                  <input
                    placeholder="Ask about products, shipping, orders, or say 'recommend'..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                  />
                  <button className="send-btn" onClick={() => handleSend()}>
                    <Send />
                  </button>
                </div>

                <div className="footer-actions">
                  <div className="small-muted">Powered by AcademicTechnexus AI</div>
                  <div className="footer-controls">
                    <button className="ghost-btn" onClick={() => { setMessages([]); setRecommended([]); }}>
                      Clear
                    </button>
                    <button className="ghost-btn" onClick={() => setAvatarPreview(null)}>Reset Avatar</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
