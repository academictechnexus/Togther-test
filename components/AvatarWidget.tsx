// components/AvatarWidget.tsx
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
 * Drop-in replacement that:
 * - Provides a walking, full-image/video mascot (walks across screen & back)
 * - Click mascot to start/stop listening (Web Speech API)
 * - Animated listening rings while recording
 * - Uses speech_url from backend if provided, otherwise uses browser TTS fallback
 * - Chat modal (conversation history, composer, recommended product cards, add-to-cart stub)
 * - Mock/demo mode when NEXT_PUBLIC_API_URL is not set
 *
 * Paste this file into components/AvatarWidget.tsx and commit.
 */

/* ---------------------------
   Demo asset sources (changeable)
   ---------------------------
   - A small, public MP4 is used for demo (sample video). Replace with your own MP4s in /public/mascots/ if you want.
   - Poster images from picsum.photos use different seeds to appear as different mascots.
*/
const SAMPLE_VIDEO =
  "https://sample-videos.com/video123/mp4/480/big_buck_bunny_480p_5mb.mp4";

// Default demo mascots (URLs point to public sample assets)
const MASCOT_ASSETS = [
  {
    id: "mascot-1",
    title: "Potato Pal",
    poster: "https://picsum.photos/seed/potato/400/400",
    video: SAMPLE_VIDEO,
    idleVideo: SAMPLE_VIDEO,
    // if you host locally, replace with "/mascots/m1_walk.mp4" etc.
    walkDistance: 700,
  },
  {
    id: "mascot-2",
    title: "Pizza Dude",
    poster: "https://picsum.photos/seed/pizza/400/400",
    video: SAMPLE_VIDEO,
    idleVideo: SAMPLE_VIDEO,
    walkDistance: 700,
  },
  {
    id: "mascot-3",
    title: "Turtle Bro",
    poster: "https://picsum.photos/seed/turtle/400/400",
    video: SAMPLE_VIDEO,
    idleVideo: SAMPLE_VIDEO,
    walkDistance: 700,
  },
  {
    id: "mascot-4",
    title: "Foxy Friend",
    poster: "https://picsum.photos/seed/fox/400/400",
    video: SAMPLE_VIDEO,
    idleVideo: SAMPLE_VIDEO,
    walkDistance: 700,
  },
  {
    id: "mascot-5",
    title: "Robo Pal",
    poster: "https://picsum.photos/seed/robot/400/400",
    video: SAMPLE_VIDEO,
    idleVideo: SAMPLE_VIDEO,
    walkDistance: 700,
  },
] as const;

type Mascot = typeof MASCOT_ASSETS[number];

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

export default function AvatarWidget(): JSX.Element {
  // UI state
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

  // animation & refs
  const controls = useAnimation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const composerRef = useRef<HTMLInputElement | null>(null);

  const selectedMascot: Mascot = MASCOT_ASSETS[selectedMascotIndex];

  /* -------------------------
     Speech recognition setup
     -------------------------*/
  useEffect(() => {
    if (!isBrowser) return;

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
    if (!response) return;

    // prefer server-provided speech_url
    if (response.speech_url) {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = response.speech_url;
      try {
        await audioRef.current.play();
      } catch (e) {
        // fallback to TTS
        speakWithTTS(response.text);
      }
      return;
    }

    // If avatar_video_url available, show it in the small overlay video element and play its audio separately if provided
    if (response.avatar_video_url && videoRef.current) {
      try {
        videoRef.current.src = response.avatar_video_url;
        await videoRef.current.play();
      } catch (e) {
        speakWithTTS(response.text);
      }
      return;
    }

    // fallback - browser TTS
    speakWithTTS(response.text);
  }

  function speakWithTTS(text?: string) {
    if (!isBrowser) return;
    if (!text) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    synth.speak(utter);
  }

  /* -------------------------
     Fetch chat (mock or real)
     -------------------------*/
  async function fetchChat(payload: {
    shop?: string;
    message: string;
    history?: any;
    mascotId?: string;
  }): Promise<ChatResponse> {
    if (mockMode) {
      await new Promise((r) => setTimeout(r, 500));
      return {
        text: `Demo reply to "${payload.message}" (mock mode).`,
        speech_url: undefined,
        avatar_video_url: undefined,
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
          mascotId: payload.mascotId,
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
     Handle send message
     -------------------------*/
  async function handleSendMessage(message: string) {
    if (!message || message.trim() === "") return;
    const newHistory = [...history, { role: "user", content: message }];
    setHistory(newHistory);

    // brief walk when interacting
    await animateWalk();

    const reply = await fetchChat({
      message,
      history: newHistory,
      mascotId: selectedMascot.id,
    });
    setLastReply(reply);
    setHistory((h) => [...h, { role: "assistant", content: reply.text }]);
    await playSpeech(reply);
  }

  /* -------------------------
     Toggle recognition
     -------------------------*/
  function toggleListening() {
    if (!isBrowser) return;
    const rec = recognitionRef.current;
    if (!rec) {
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
     Walk animation (across screen & back)
     -------------------------*/
  async function animateWalk() {
    setIsWalking(true);
    const viewportWidth = isBrowser ? window.innerWidth : 1200;
    // The movement range - tune multiplier to make it longer/shorter
    const distance = Math.min(viewportWidth * 0.75, selectedMascot.walkDistance ?? 800);
    // Move right -> left -> right -> dock (gives a visible "walk across" motion)
    await controls.start({
      x: [0, -distance, distance * 0.3, 0],
      transition: { duration: 3.2, times: [0, 0.45, 0.8, 1], ease: "easeInOut" },
    });
    setIsWalking(false);
  }

  /* -------------------------
     keyboard shortcut (Ctrl/Cmd+K) toggles chat modal
     -------------------------*/
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    if (isBrowser) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, []);

  /* -------------------------
     Helper: choose which video (idle vs walk)
     -------------------------*/
  const displayVideoSrc =
    isWalking && selectedMascot.video ? selectedMascot.video : selectedMascot.idleVideo ?? selectedMascot.video;

  /* -------------------------
     Render
     -------------------------*/
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        right: 28,
        bottom: 24,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <motion.div
        animate={controls}
        initial={{ x: 0 }}
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: 12,
          transform: "translateZ(0)",
        }}
      >
        {/* speech bubble */}
        <div
          style={{
            display: lastReply ? "block" : "none",
            maxWidth: 300,
            marginRight: 8,
            background: "white",
            borderRadius: 12,
            padding: "10px 12px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            pointerEvents: "auto",
            fontSize: 13,
          }}
        >
          {lastReply?.text ?? ""}
        </div>

        {/* mascot container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: "auto",
          }}
        >
          <div
            role="button"
            onClick={() => toggleListening()}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") toggleListening();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 160,
              height: 160,
              position: "relative",
              pointerEvents: "auto",
              cursor: "pointer",
            }}
          >
            {/* animated rings */}
            <motion.div
              animate={
                listening
                  ? { scale: [1, 1.12, 1], opacity: [0.6, 0.95, 0.6] }
                  : { scale: 1, opacity: 1 }
              }
              transition={{ repeat: listening ? Infinity : 0, duration: 1.2 }}
              style={{
                position: "absolute",
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: "rgba(99,102,241,0.06)",
                zIndex: 1,
                pointerEvents: "none",
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
                width: 124,
                height: 124,
                borderRadius: "50%",
                background: "rgba(99,102,241,0.04)",
                zIndex: 1,
                pointerEvents: "none",
              }}
            />

            {/* main video / poster */}
            {displayVideoSrc ? (
              <video
                key={selectedMascot.id + (isWalking ? "-walk" : "-idle")}
                src={displayVideoSrc}
                poster={selectedMascot.poster}
                loop
                muted
                playsInline
                autoPlay
                style={{
                  width: 160,
                  height: 160,
                  objectFit: "cover",
                  borderRadius: 14,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
                  zIndex: 3,
                }}
              />
            ) : (
              <img
                src={selectedMascot.poster}
                alt={selectedMascot.title}
                style={{
                  width: 160,
                  height: 160,
                  objectFit: "cover",
                  borderRadius: 14,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
                  zIndex: 3,
                }}
              />
            )}

            {/* mic badge */}
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
                padding: "6px 10px",
                borderRadius: 20,
                boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
                zIndex: 6,
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
                  gap: 8,
                }}
                aria-pressed={listening}
              >
                <Mic2 size={16} />
                <span style={{ fontSize: 13 }}>{listening ? "Listening" : "Speak"}</span>
              </button>
            </div>
          </div>

          {/* controls: mute, open chat, mascot selector */}
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

            {/* small mascot selector */}
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
                    width: 36,
                    height: 36,
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
            width: 380,
            maxWidth: "calc(100vw - 40px)",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 20px 50px rgba(2,6,23,0.2)",
            padding: 14,
            zIndex: 10000,
            pointerEvents: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
              maxHeight: 320,
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
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>

          {/* recommended products */}
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

      {/* hidden audio/video elements */}
      <audio ref={audioRef} style={{ display: "none" }} />
      <video ref={videoRef} style={{ display: "none" }} playsInline />

      {/* small helper button */}
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
