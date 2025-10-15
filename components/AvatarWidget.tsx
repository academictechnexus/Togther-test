import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import {
  Mic2,
  Keyboard,
  Volume2,
  VolumeX,
  MessageSquare,
  X as XIcon,
} from "lucide-react";

/**
 * AvatarWidget.tsx
 *
 * Enhanced "full-image" mascot widget:
 * - Full-image/video mascots that can walk across the screen (animated with framer-motion).
 * - Click mascot to start/stop listening (Web Speech API).
 * - Plays backend-provided speech_url (audio) or falls back to browser TTS.
 * - If avatar_video_url provided, shows lip-synced video overlay near mascot.
 * - Keeps the chat modal, speech bubble, recommended products and mock mode behavior.
 *
 * Requirements:
 * - framer-motion and lucide-react installed.
 * - Provide high-quality assets (mp4/webm or png) and set their URLs in MASCOT_ASSETS below.
 *
 * NOTE: keep CSS/utility classes minimal — adapt to your Tailwind/design system.
 */

/* -------------------------
   Configure mascot assets
   -------------------------
   Replace these URLs with your high-quality mascots.
   Each entry may have:
     - poster: static PNG used as fallback
     - video: looping MP4/WebM used for walking/idle
     - walkDistance: px to move across when doing "walk" animation
*/
const MASCOT_ASSETS = [
  {
    id: "mascot-1",
    title: "Forest Walker",
    poster: "/mascots/m1.png",
    video: "/mascots/m1_walk.mp4", // optional
    idleVideo: "/mascots/m1_idle.mp4",
    walkDistance: 220,
  },
  {
    id: "mascot-2",
    title: "Robo Concierge",
    poster: "/mascots/m2.png",
    video: "/mascots/m2_walk.mp4",
    idleVideo: "/mascots/m2_idle.mp4",
    walkDistance: 260,
  },
  {
    id: "mascot-3",
    title: "Friendly Guide",
    poster: "/mascots/m3.png",
    video: "/mascots/m3_walk.mp4",
    idleVideo: "/mascots/m3_idle.mp4",
    walkDistance: 200,
  },
  {
    id: "mascot-4",
    title: "Pixel Pal",
    poster: "/mascots/m4.png",
    video: "/mascots/m4_walk.mp4",
    idleVideo: "/mascots/m4_idle.mp4",
    walkDistance: 240,
  },
  {
    id: "mascot-5",
    title: "Aurora",
    poster: "/mascots/m5.png",
    video: "/mascots/m5_walk.mp4",
    idleVideo: "/mascots/m5_idle.mp4",
    walkDistance: 210,
  },
] as const;

/* -------------------------
   Types
   -------------------------*/
type MascotAsset = typeof MASCOT_ASSETS[number];

type ChatResponse = {
  text: string;
  speech_url?: string;
  avatar_video_url?: string;
  recommended_products?: Array<{
    id: number | string;
    title: string;
    price?: string;
    handle?: string;
    variant_id?: number;
  }>;
  expression?: string;
};

const isBrowser = typeof window !== "undefined";

/* -------------------------
   Component
   -------------------------*/
export default function AvatarWidget(): JSX.Element {
  const [open, setOpen] = useState(false); // chat modal
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>(
    []
  );
  const [lastReply, setLastReply] = useState<ChatResponse | null>(null);
  const [selectedMascotIndex, setSelectedMascotIndex] = useState(0);
  const [mockMode] = useState(!process.env.NEXT_PUBLIC_API_URL);
  const [isWalking, setIsWalking] = useState(false);
  const controls = useAnimation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLInputElement | null>(null);

  const selectedMascot: MascotAsset = MASCOT_ASSETS[selectedMascotIndex];

  /* -------------------------
     Speech recognition setup
     -------------------------*/
  useEffect(() => {
    if (!isBrowser) return;

    // Type defs avoided for broad browser compatibility
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (evt: any) => {
      const transcript = evt.results[0][0].transcript;
      handleSendMessage(transcript);
    };
    rec.onend = () => {
      setListening(false);
    };
    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // noop
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------
     Play speech url or TTS
     -------------------------*/
  async function playSpeech(response: ChatResponse) {
    if (muted) return;
    // prefer server provided speech_url
    if (response.speech_url) {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = response.speech_url;
      try {
        await audioRef.current.play();
      } catch (e) {
        // fallback to TTS if play blocked
        speakWithTTS(response.text);
      }
      return;
    }

    // If avatar_video_url available, we also display it (lip-sync)
    if (response.avatar_video_url && videoRef.current) {
      videoRef.current.src = response.avatar_video_url;
      try {
        await videoRef.current.play();
      } catch (e) {
        // If video cannot play, fallback to TTS
        speakWithTTS(response.text);
      }
      return;
    }

    // fallback to browser TTS
    speakWithTTS(response.text);
  }

  function speakWithTTS(text: string) {
    if (!isBrowser) return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    synth.speak(utter);
  }

  /* -------------------------
     Send message to server (or mock)
     -------------------------*/
  async function fetchChat(payload: {
    shop?: string;
    message: string;
    history?: any;
  }): Promise<ChatResponse> {
    if (mockMode) {
      // demo reply — mimic a small delay
      await new Promise((r) => setTimeout(r, 600));
      return {
        text: `Demo reply to: "${payload.message}" — try providing a real NEXT_PUBLIC_API_URL for live replies.`,
        speech_url: undefined,
        recommended_products: [
          {
            id: "demo-1",
            title: "Demo Product",
            price: "$9.99",
            handle: "demo-product",
            variant_id: 111,
          },
        ],
        expression: "happy",
      };
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.NEXT_PUBLIC_API_KEY
            ? { "x-api-key": process.env.NEXT_PUBLIC_API_KEY }
            : {}),
        },
        body: JSON.stringify({
          shop: process.env.NEXT_PUBLIC_SHOP || undefined,
          message: payload.message,
          history: payload.history || [],
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat API error ${res.status}`);
      }
      const json = (await res.json()) as ChatResponse;
      return json;
    } catch (err) {
      console.error("chat fetch error", err);
      return {
        text:
          "Sorry, I couldn't reach the server. Running in demo mode. Please check your NEXT_PUBLIC_API_URL.",
      };
    }
  }

  /* -------------------------
     Handle new message flow
     -------------------------*/
  async function handleSendMessage(message: string) {
    if (!message || message.trim() === "") return;
    // add to history locally
    const newHistory = [...history, { role: "user", content: message }];
    setHistory(newHistory);
    // small "walk" animation to approach user when user sends message
    await animateWalk();

    const reply = await fetchChat({ message, history: newHistory });
    setLastReply(reply);
    setHistory((h) => [...h, { role: "assistant", content: reply.text }]);
    await playSpeech(reply);
  }

  /* -------------------------
     Recognition toggles
     -------------------------*/
  function toggleListening() {
    if (!isBrowser) return;
    const rec = recognitionRef.current;
    if (!rec) {
      // No browser support
      alert("Speech recognition not supported in this browser.");
      return;
    }
    if (!listening) {
      try {
        rec.start();
        setListening(true);
      } catch (e) {
        console.warn("recognition start error", e);
      }
    } else {
      try {
        rec.stop();
        setListening(false);
      } catch (e) {
        // noop
      }
    }
  }

  /* -------------------------
     Walk animation (mascot moves toward center & back)
     -------------------------*/
  async function animateWalk() {
    // brief walk when interacting
    setIsWalking(true);
    const distance = selectedMascot.walkDistance ?? 220;
    await controls.start({
      x: [0, -distance / 2, 0], // small forward & back movement loop
      transition: { duration: 1.2, times: [0, 0.5, 1] },
    });
    setIsWalking(false);
  }

  /* -------------------------
     Keyboard handling for opening chat quickly
     -------------------------*/
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ctrl+k or meta+k OR press "k" on widget focus to open
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    if (isBrowser) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    return;
  }, []);

  /* -------------------------
     Render helpers
     -------------------------*/
  function renderMascot() {
    // If there's an avatar_video_url from last reply, show it in the video overlay
    const avatarVideo = lastReply?.avatar_video_url;

    // Use the high-quality walking video if available, otherwise fall back to static poster
    return (
      <div
        className="avatar-container"
        style={{
          position: "relative",
          width: 124,
          height: 124,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          pointerEvents: "auto",
        }}
      >
        {/* Video element for lip-synced avatar (overlay) */}
        <video
          ref={videoRef}
          style={{
            position: "absolute",
            bottom: 0,
            right: "100%",
            width: 340,
            height: "auto",
            zIndex: 60,
            borderRadius: 12,
            display: avatarVideo ? "block" : "none",
            pointerEvents: "none",
          }}
          playsInline
          muted={muted}
        />

        {/* Main mascot visual: video if available or poster image */}
        {selectedMascot.video ? (
          <motion.video
            key={selectedMascot.id}
            src={selectedMascot.video}
            poster={selectedMascot.poster}
            loop
            muted
            playsInline
            autoPlay
            style={{
              width: 124,
              height: 124,
              objectFit: "contain",
              borderRadius: 10,
              boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
              zIndex: 50,
              cursor: "pointer",
            }}
            onClick={() => {
              // click to focus: toggle listening
              toggleListening();
            }}
          />
        ) : (
          <img
            src={selectedMascot.poster}
            alt={selectedMascot.title}
            style={{
              width: 124,
              height: 124,
              objectFit: "contain",
              borderRadius: 10,
              boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
              zIndex: 50,
              cursor: "pointer",
            }}
            onClick={() => toggleListening()}
          />
        )}
      </div>
    );
  }

  /* -------------------------
     Render UI
     -------------------------*/
  return (
    <div
      ref={widgetRef}
      className="avatar-widget"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 28,
        bottom: 24,
        zIndex: 9999,
        pointerEvents: "none", // container non-interactive; internal elements are interactive
      }}
    >
      {/* Mascot motion wrapper (walks horizontally in micro-animations when interacting) */}
      <motion.div
        animate={controls}
        initial={{ x: 0 }}
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: 12,
          transform: "translateZ(0)", // GPU accelerate
        }}
      >
        {/* speech bubble near mascot */}
        <div
          style={{
            display: lastReply ? "block" : "none",
            maxWidth: 280,
            marginRight: 8,
            background: "white",
            borderRadius: 12,
            padding: "10px 12px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: 13, color: "#111" }}>
            {lastReply?.text ?? ""}
          </div>
        </div>

        {/* Mascot visual */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: "auto",
          }}
        >
          {/* Animated listening rings */}
          <div
            onClick={() => toggleListening()}
            role="button"
            aria-label="Mascot - click to speak"
            tabIndex={0}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 154,
              height: 154,
              pointerEvents: "auto",
              position: "relative",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") toggleListening();
            }}
          >
            {/* rings */}
            <motion.div
              animate={
                listening
                  ? { scale: [1, 1.12, 1], opacity: [0.6, 0.9, 0.6] }
                  : { scale: 1, opacity: 1 }
              }
              transition={{ repeat: listening ? Infinity : 0, duration: 1.2 }}
              style={{
                position: "absolute",
                width: 154,
                height: 154,
                borderRadius: "50%",
                background: "rgba(99,102,241,0.08)",
                pointerEvents: "none",
                zIndex: 40,
              }}
            />
            <motion.div
              animate={
                listening
                  ? { scale: [1, 1.08, 1], opacity: [0.4, 0.85, 0.4] }
                  : { scale: 1, opacity: 1 }
              }
              transition={{ repeat: listening ? Infinity : 0, duration: 1.6 }}
              style={{
                position: "absolute",
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "rgba(99,102,241,0.06)",
                pointerEvents: "none",
                zIndex: 39,
              }}
            />
            {/* actual mascot */}
            {renderMascot()}
            {/* small mic badge */}
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: 6,
                alignItems: "center",
                background: "rgba(255,255,255,0.95)",
                padding: "4px 8px",
                borderRadius: 20,
                boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
                zIndex: 70,
              }}
            >
              <button
                onClick={() => toggleListening()}
                title={listening ? "Stop listening" : "Start listening"}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                aria-pressed={listening}
              >
                <Mic2 size={16} />
                <span style={{ fontSize: 12 }}>
                  {listening ? "Listening..." : "Speak"}
                </span>
              </button>
            </div>
          </div>

          {/* controls row (mute, open chat, change mascot) */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              alignItems: "center",
              pointerEvents: "auto",
            }}
          >
            <button
              onClick={() => setMuted((m) => !m)}
              title={muted ? "Unmute" : "Mute"}
              style={{
                border: "none",
                background: "white",
                padding: 8,
                borderRadius: 10,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                cursor: "pointer",
              }}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <button
              onClick={() => setOpen((o) => !o)}
              title="Open chat"
              style={{
                border: "none",
                background: "white",
                padding: 8,
                borderRadius: 10,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                cursor: "pointer",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <Keyboard size={14} />
              <span style={{ fontSize: 13 }}>Chat</span>
            </button>

            {/* Mascot selector (small) */}
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                background: "rgba(255,255,255,0.95)",
                padding: "6px 8px",
                borderRadius: 12,
                boxShadow: "0 6px 14px rgba(0,0,0,0.04)",
              }}
            >
              {MASCOT_ASSETS.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMascotIndex(i)}
                  title={m.title}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    overflow: "hidden",
                    border:
                      selectedMascotIndex === i
                        ? "2px solid rgb(99,102,241)"
                        : "1px solid rgba(16,24,40,0.06)",
                    padding: 0,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={m.poster}
                    alt={m.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Chat modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            right: 28,
            bottom: 190,
            width: 360,
            maxWidth: "calc(100vw - 40px)",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 20px 50px rgba(2,6,23,0.2)",
            padding: 14,
            zIndex: 10000,
            pointerEvents: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Chat with {selectedMascot.title}</strong>
            <button
              title="Close"
              onClick={() => setOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <XIcon size={16} />
            </button>
          </div>

          <div
            style={{
              marginTop: 12,
              maxHeight: 340,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              paddingRight: 6,
            }}
          >
            {history.length === 0 && (
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                Say hi to start the conversation — click the mascot or press
                Ctrl/Cmd+K.
              </div>
            )}

            {history.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "#eef2ff" : "#f3f4f6",
                  padding: "8px 10px",
                  borderRadius: 10,
                  maxWidth: "85%",
                  fontSize: 13,
                }}
              >
                {m.content}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={composerRef}
              type="text"
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = (e.target as HTMLInputElement).value;
                  (e.target as HTMLInputElement).value = "";
                  handleSendMessage(v);
                }
              }}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(16,24,40,0.06)",
              }}
            />
            <button
              title="Send"
              onClick={() => {
                const v = composerRef.current?.value ?? "";
                if (!v) return;
                composerRef.current!.value = "";
                handleSendMessage(v);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                background: "rgb(99,102,241)",
                color: "white",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>

          {/* recommended products (from lastReply) */}
          {lastReply?.recommended_products?.length ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Recommended</div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                {lastReply.recommended_products!.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      minWidth: 160,
                      background: "#fff",
                      border: "1px solid rgba(16,24,40,0.04)",
                      padding: 8,
                      borderRadius: 8,
                      boxShadow: "0 6px 12px rgba(2,6,23,0.04)",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>{p.price}</div>
                    <button
                      style={{
                        marginTop: 8,
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: "none",
                        background: "rgb(99,102,241)",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                      onClick={() => {
                        // Add-to-cart stub: you should replace with pages/api/shopify-add-to-cart.ts
                        alert(
                          `Add-to-cart stub: implement pages/api/shopify-add-to-cart.ts to add ${p.title} to cart.`
                        );
                      }}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* hidden audio/video elements (controlled programmatically) */}
      <audio ref={audioRef} style={{ display: "none" }} />
      <video ref={videoRef} style={{ display: "none" }} playsInline />

      {/* small accessibility helper for keyboard open */}
      <div style={{ position: "fixed", right: 30, bottom: 8, zIndex: 9999 }}>
        <button
          onClick={() => setOpen((o) => !o)}
          title="Open chat (Ctrl/Cmd+K)"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          <MessageSquare size={18} />
        </button>
      </div>
    </div>
  );
}
