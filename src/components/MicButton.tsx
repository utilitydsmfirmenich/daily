import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { api } from "../lib/api-client";

interface MicButtonProps {
  onResult: (kegiatan: string, kategori: string) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export const MicButton: React.FC<MicButtonProps> = ({
  onResult,
  disabled = false,
  className = "",
  size = "md"
}) => {
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const chosenMimeTypeRef = useRef<string>("audio/webm");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, []);

  const stopAllMedia = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
      return "audio/webm";
    }
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/wav"
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return "";
  };

  const startRecording = async () => {
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage("Browser Anda tidak mendukung akses mikrofon.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      chosenMimeTypeRef.current = mimeType || "audio/webm";

      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Turn off mic hardware
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: chosenMimeTypeRef.current
        });

        if (audioBlob.size < 500) {
          setState("idle");
          setErrorMessage("Rekaman terlalu singkat atau tidak ada suara.");
          return;
        }

        setState("processing");

        try {
          // Convert blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const dataUrl = reader.result as string;
            const base64Data = dataUrl.split(",")[1];
            if (!base64Data) {
              setState("idle");
              setErrorMessage("Gagal memproses data rekaman suara.");
              return;
            }

            try {
              const res = await api.transcribeVoice(
                base64Data,
                chosenMimeTypeRef.current
              );
              onResult(res.kegiatan, res.kategori);
              setState("idle");
            } catch (err: any) {
              setState("idle");
              setErrorMessage(err?.message || "Gagal mentranskripsi suara dengan Gemini AI.");
            }
          };
        } catch (err: any) {
          setState("idle");
          setErrorMessage(err?.message || "Gagal membaca audio.");
        }
      };

      mediaRecorder.start(250); // Slice data every 250ms
      setState("recording");
      setSecondsLeft(30);

      // Countdown timer 30 seconds
      let remaining = 30;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          stopRecording();
        }
      }, 1000);
    } catch (err: any) {
      console.error("Microphone error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Izin akses mikrofon ditolak oleh browser.");
      } else {
        setErrorMessage("Tidak dapat mengakses mikrofon: " + (err.message || ""));
      }
      setState("idle");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping recorder:", err);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (state === "idle") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {state === "idle" && (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          title="Bicara untuk mengisi kegiatan dan kategori otomatis dengan Gemini AI"
          className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition shadow-sm ${
            size === "sm"
              ? "px-2.5 py-1 text-xs"
              : "px-3 py-1.5 text-xs"
          } bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 hover:from-blue-600/30 hover:via-indigo-600/30 hover:to-purple-600/30 border-indigo-500/40 hover:border-indigo-400 text-indigo-200 hover:text-white disabled:opacity-50`}
        >
          <Mic className={`${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} text-indigo-400`} />
          <span className="font-medium">Voice</span>
          <Sparkles className="w-3 h-3 text-amber-400" />
        </button>
      )}

      {state === "recording" && (
        <button
          type="button"
          onClick={handleClick}
          title="Klik untuk selesai merekam"
          className={`inline-flex items-center gap-2 rounded-lg font-bold text-xs bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-md shadow-red-600/40 transition ${
            size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5"
          }`}
        >
          <Square className="w-3 h-3 fill-white" />
          <span>Bicara... ({secondsLeft}s)</span>
        </button>
      )}

      {state === "processing" && (
        <div
          className={`inline-flex items-center gap-1.5 rounded-lg border font-medium text-xs bg-indigo-950/80 border-indigo-500/50 text-indigo-300 shadow-sm ${
            size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5"
          }`}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          <span>Memproses AI...</span>
        </div>
      )}

      {/* Error alert toast */}
      {errorMessage && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-72 p-2.5 rounded-lg bg-red-950/95 border border-red-500/50 text-red-200 text-xs shadow-xl backdrop-blur-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="leading-snug">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-white text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
