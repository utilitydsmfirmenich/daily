import React, { forwardRef, useState, useEffect } from "react";
import { formatTimeOnBlur, normalizeTimeString } from "../lib/time-utils";

export interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  ariaLabel?: string;
}

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "HH:MM",
      className = "",
      disabled = false,
      onKeyDown,
      ariaLabel
    },
    ref
  ) => {
    // Local display text to allow natural intermediate typing (e.g. "1", "16", "16:")
    const [text, setText] = useState(value || "");

    useEffect(() => {
      setText(value || "");
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;

      // Replace dots with colons
      raw = raw.replace(/\./g, ":");

      // Filter only numbers and colon
      const filtered = raw.replace(/[^\d:]/g, "");

      // If user is typing 3 or 4 continuous digits without colon, auto-insert colon
      // e.g. "160" -> "16:0", "1600" -> "16:00", "2400" -> "24:00"
      let formatted = filtered;
      if (!filtered.includes(":") && filtered.length >= 3) {
        formatted = `${filtered.slice(0, 2)}:${filtered.slice(2, 4)}`;
      } else if (filtered.length > 5) {
        formatted = filtered.slice(0, 5);
      }

      setText(formatted);
      onChange(formatted);
    };

    const handleBlur = () => {
      if (!text.trim()) {
        onChange("");
        return;
      }
      const formatted = formatTimeOnBlur(text);
      setText(formatted);
      onChange(formatted);
    };

    // Check validity for subtle visual feedback if length >= 4
    const isPotentiallyValid = !text.trim() || normalizeTimeString(text) !== null || text.length < 4;

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        maxLength={5}
        className={`w-full bg-slate-900 border ${
          isPotentiallyValid ? "border-slate-700" : "border-amber-500/80 ring-1 ring-amber-500/50"
        } rounded-lg px-3 py-2 text-sm font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition disabled:opacity-50 ${className}`}
      />
    );
  }
);

TimeInput.displayName = "TimeInput";
