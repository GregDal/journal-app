"use client";

import { MOOD_EMOJIS } from "@/lib/types";

interface MoodPickerProps {
  value: number | null;
  onChange: (score: number) => void;
}

export default function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        How are you feeling?
      </label>
      <div className="flex gap-2">
        {MOOD_EMOJIS.map((emoji, i) => {
          const score = i + 1;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all ${
                value === score
                  ? "bg-accent ring-2 ring-primary scale-110"
                  : "bg-card hover:bg-accent"
              }`}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
