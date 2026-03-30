"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface StateTagPickerProps {
  label: string;
  tags: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  freeText?: string;
  onFreeTextChange?: (text: string) => void;
}

export default function StateTagPicker({
  label,
  tags,
  selected,
  onChange,
  freeText = "",
  onFreeTextChange,
}: StateTagPickerProps) {
  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant={selected.includes(tag) ? "default" : "outline"}
            className="cursor-pointer select-none transition-colors"
            onClick={() => toggle(tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>
      <Input
        placeholder="Or describe in your own words..."
        value={freeText}
        onChange={(e) => onFreeTextChange?.(e.target.value)}
        className="mt-1"
      />
    </div>
  );
}
