// components/AvatarWidget.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bot, Mic, Send, Maximize2, ShoppingCart, Sparkles } from "lucide-react";

// Types
type ShopifyProduct = {
  id: number;
  title: string;
  price: string;
  handle?: string;
  variant_id?: number;
};

type Message = {
  id: number;
  text: string;
  sender: "user" | "assistant";
  timestamp: string;
  type?: "general" | "store";
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.academictechnexus.com/v1/chat";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "REPLACE_ME_FOR_TEST";
const DEFAULT_SHOP = process.env.NEXT_PUBLIC_SHOP || "demo-shop.myshopify.com";

export default function AvatarWidget() {
  const [isMinimized, setIsMinimized] = useState(true);
  const [isEnabled] = useState(true);
  const [interactionMode] = useState<"text" | "voice">("text");
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<ShopifyProduct[]>([]);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          text: language === "en" ? "Hello! I'm here to help if you need anything." : "Bonjour! Je suis ici pour vous aider.",
          sender: "assistant",
          timestamp: new Date().toISOString(),
          type: "general",
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => scrollToBottom(), [messages, isTyping, recommendedProducts, avatarVideoUrl]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function appendMessage(m: Message) {
    setMessages((p) => [...p, m]);
  }

  async function callBackend(shop: string, message: string, history: { role: string; content: string }[] = []) {
    setIsTyping(true);
    setAvatarVideoUrl(null);
    try {
      const payload = { shop, message, history };
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "backend_error");
        throw new Error(text);
      }
      const data = await resp.json();
      return data;
    } catch (err) {
      console.error("Backend call failed:", err);
      return { text: language === "en" ? "Sorry, something went wrong." : "Désolé, une erreur est survenue." };
    } finally {
      setIsTyping(false);
    }
  }

  const handleSend = async () => {
    const text = userInput.trim();
    if (!text) return;
    const userMsg: Message = { id: Date.now(), text, sender: "user", timestamp: new Date().toISOString() };
    appendMessage(userMsg);
    setUserInput("");

    const shop = (window as any).Shopify?.shop || DEFAULT_SHOP;
    const history = messages.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));

    const result = await callBackend(shop, text, history);

    const assistantMsg: Message = {
      id: Date.now() + 1,
      text: result.text || (language === "en" ? "No answer." : "Pas de réponse."),
      sender: "assistant",
      timestamp: new Date().toISOString(),
      type: result.recommended_products ? "store" : "general",
    };
    appendMessage(assistantMsg);

    if (result.recommended_products && Array.isArray(result.recommended_products)) {
      setRecommendedProducts(result.recommended_products);
    } else {
      setRecommendedProducts([]);
    }
    if (result.avatar_video_url) setAvatarVideoUrl(result.avatar_video_url);
    else setAvatarVideoUrl(null);
  };

  const handleAddToCart = async (p: ShopifyProduct) => {
    appendMessage({ id: Date.now(), text: `${p.title} added to cart.`, sender: "assistant", timestamp: new Date().toISOString(), type: "store" });
    setRecommendedProducts([]);
    try {
      if ((p as any).variant_id) {
        await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: (p as any).variant_id, quantity: 1 }),
        });
      } else if (p.handle) {
        window.location.href = `/products/${p.handle}`;
      }
    } catch (err) {
      console.warn("Add to cart failed", err);
    }
  };

  const handleVoiceInput = () => {
    setIsTyping(true);
    setTimeout(() => {
      setUserInput(language === "en" ? "Can you recommend headphones?" : "Pouvez-vous recommander des écouteurs ?");
      setIsTyping(false);
    }, 900);
  };

  if (!isEnabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isMinimized ? (
        <button aria-label="Open assistant" onClick={() => setIsMinimized(false)} className="h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center">
          <Bot />
        </button>
      ) : (
        <div className="w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-3 flex items-center justify-between border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot />
              </div>
              <div>
                <div className="font-semibold">{language === "en" ? "Shopping Assistant" : "Assistant"}</div>
                <div className="text-xs text-green-600">Online</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(true)} className="p-2 rounded hover:bg-gray-50">
                <Maximize2 />
              </button>
            </div>
          </div>

          <div className="p-3 h-[420px] flex flex-col">
            <div className="flex-1 overflow-y-auto mb-2">
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                    {m.sender === "assistant" && (
                      <div className="mr-2 flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Bot />
                      </div>
                    )}
                    <div className={`${m.sender === "user" ? "bg-indigo-600 text-white rounded-2xl p-2" : "bg-white border rounded-2xl p-2"} max-w-[80%]`}>
                      <div className="text-sm">{m.text}</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(m.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Bot />
                    </div>
                    <div className="bg-white border p-2 rounded-2xl">...</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {recommendedProducts.length > 0 && (
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles />
                  <div className="font-semibold">Recommended for you</div>
                </div>
                <div className="space-y-2">
                  {recommendedProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-indigo-600">{p.price}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => (p.handle ? (window.location.href = `/products/${p.handle}`) : null)} className="text-xs border rounded px-2 py-1">
                          View
                        </button>
                        <button onClick={() => handleAddToCart(p)} className="text-xs bg-indigo-600 text-white rounded px-2 py-1 flex items-center gap-1">
                          <ShoppingCart /> Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {avatarVideoUrl && (
              <div className="mt-2">
                <video src={avatarVideoUrl} autoPlay playsInline controls={false} style={{ width: "100%", borderRadius: 8 }} />
              </div>
            )}

            <div className="mt-2 flex items-end gap-2">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={language === "en" ? "Ask about products, shipping, or anything..." : "Posez une question..."}
                className="flex-1 border rounded p-2 min-h-[44px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex flex-col gap-1">
                {interactionMode === "voice" && (
                  <button onClick={handleVoiceInput} className="p-2 rounded bg-gray-100">
                    <Mic />
                  </button>
                )}
                <button onClick={() => handleSend()} className="p-2 rounded bg-indigo-600 text-white">
                  <Send />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

