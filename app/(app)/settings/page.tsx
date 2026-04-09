"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tag, MetricDefinition } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Check } from "lucide-react";
import { THEMES, type Theme, setThemeCookie, getThemeFromCookie } from "@/lib/theme";

export default function SettingsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [newTag, setNewTag] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [newMetricName, setNewMetricName] = useState("");
  const [newMetricType, setNewMetricType] = useState<"number" | "text" | "boolean">("number");
  const [newMetricUnit, setNewMetricUnit] = useState("");
  const [currentTheme, setCurrentTheme] = useState<Theme>("earth");
  const supabase = createClient();

  useEffect(() => {
    loadData();
    setCurrentTheme(getThemeFromCookie(document.cookie));
  }, []);

  async function loadData() {
    const { data: tagsData } = await supabase
      .from("tags")
      .select("*")
      .order("name");
    const { data: metricsData } = await supabase
      .from("metric_definitions")
      .select("*")
      .order("name");

    if (tagsData) setTags(tagsData);
    if (metricsData) setMetrics(metricsData);
  }

  async function addTag() {
    if (!newTag.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("tags").insert({
      user_id: user.id,
      name: newTag.trim(),
      color: newTagColor,
    });

    setNewTag("");
    loadData();
  }

  async function deleteTag(id: string) {
    await supabase.from("tags").delete().eq("id", id);
    loadData();
  }

  async function addMetric() {
    if (!newMetricName.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("metric_definitions").insert({
      user_id: user.id,
      name: newMetricName.trim(),
      type: newMetricType,
      unit: newMetricUnit || null,
    });

    setNewMetricName("");
    setNewMetricUnit("");
    loadData();
  }

  async function deleteMetric(id: string) {
    await supabase.from("metric_definitions").delete().eq("id", id);
    loadData();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Color theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((theme) => {
              const config = {
                earth: {
                  label: "Earth",
                  colors: ["#8B6F47", "#7A8B5C", "#C4A882"],
                  desc: "Warm tans & sage",
                },
                ocean: {
                  label: "Ocean",
                  colors: ["#3B6B8A", "#5BA89D", "#8FAFC4"],
                  desc: "Blue-gray & seafoam",
                },
                lavender: {
                  label: "Lavender",
                  colors: ["#7B5EA7", "#C49BBB", "#B8A9D4"],
                  desc: "Muted purple & rose",
                },
              }[theme];

              return (
                <button
                  key={theme}
                  onClick={() => {
                    setCurrentTheme(theme);
                    setThemeCookie(theme);
                    document.documentElement.className =
                      document.documentElement.className
                        .replace(/theme-\w+/g, "")
                        .trim() + ` theme-${theme}`;
                  }}
                  className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                    currentTheme === theme
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {currentTheme === theme && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="flex gap-1">
                    {config.colors.map((c, i) => (
                      <div
                        key={i}
                        className="h-6 w-6 rounded-full"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {config.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-1">
                <Badge style={{ backgroundColor: tag.color, color: "#fff" }}>
                  {tag.name}
                </Badge>
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="New tag name"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              className="flex-1"
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded border border-border bg-transparent"
            />
            <Button size="icon" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Custom metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {metrics.length > 0 && (
            <div className="space-y-2">
              {metrics.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({m.type}
                      {m.unit ? `, ${m.unit}` : ""})
                    </span>
                  </div>
                  <button
                    onClick={() => deleteMetric(m.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Metric name (e.g., Sleep)"
              value={newMetricName}
              onChange={(e) => setNewMetricName(e.target.value)}
              className="flex-1"
            />
            <select
              value={newMetricType}
              onChange={(e) =>
                setNewMetricType(e.target.value as "number" | "text" | "boolean")
              }
              className="rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="number">Number</option>
              <option value="text">Text</option>
              <option value="boolean">Yes/No</option>
            </select>
            <Input
              placeholder="Unit"
              value={newMetricUnit}
              onChange={(e) => setNewMetricUnit(e.target.value)}
              className="w-20"
            />
            <Button size="icon" onClick={addMetric}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* AI Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            AI provider is configured via environment variables. Currently using
            Claude (Anthropic).
          </p>
          <p className="text-xs text-muted-foreground">
            To switch to a local LLM (Ollama), set OLLAMA_ENDPOINT and
            OLLAMA_MODEL in your .env.local file.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
