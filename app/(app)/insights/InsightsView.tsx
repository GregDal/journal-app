"use client";

import { useState } from "react";
import type { AIInsight, MoodLog } from "@/lib/types";
import { MOOD_EMOJIS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface EntryRow {
  id: string;
  entry_type: string;
  prompts: Record<string, unknown> | null;
  created_at: string;
}

interface InsightsViewProps {
  insights: AIInsight[];
  moodLogs: (MoodLog & { entries: { created_at: string; entry_type: string } | null })[];
  entries: EntryRow[];
}

export default function InsightsView({
  insights,
  moodLogs,
  entries,
}: InsightsViewProps) {
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // --- Mood over time ---
  const moodData = moodLogs.map((log) => ({
    date: new Date(log.entries?.created_at || "").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    mood: log.mood_score,
    type: log.entries?.entry_type || "unknown",
  }));

  // --- Entry frequency by week ---
  const weekMap: Record<string, number> = {};
  entries.forEach((e) => {
    const d = new Date(e.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    weekMap[key] = (weekMap[key] || 0) + 1;
  });
  const frequencyData = Object.entries(weekMap)
    .slice(-12)
    .map(([week, count]) => ({ week, count }));

  // --- Mood by entry type ---
  const typeScores: Record<string, { total: number; count: number }> = {};
  moodLogs.forEach((log) => {
    const type = log.entries?.entry_type || "unknown";
    if (!typeScores[type]) typeScores[type] = { total: 0, count: 0 };
    typeScores[type].total += log.mood_score;
    typeScores[type].count += 1;
  });
  const moodByType = Object.entries(typeScores).map(([type, { total, count }]) => ({
    type,
    avg: Math.round((total / count) * 10) / 10,
  }));

  // --- State tag frequency ---
  const physicalCounts: Record<string, number> = {};
  const emotionalCounts: Record<string, number> = {};
  entries.forEach((e) => {
    const prompts = e.prompts as Record<string, unknown> | null;
    if (!prompts) return;
    const physical = prompts.physical_state;
    const emotional = prompts.emotional_state;
    if (Array.isArray(physical)) {
      physical.forEach((tag: string) => {
        physicalCounts[tag] = (physicalCounts[tag] || 0) + 1;
      });
    }
    if (Array.isArray(emotional)) {
      emotional.forEach((tag: string) => {
        emotionalCounts[tag] = (emotionalCounts[tag] || 0) + 1;
      });
    }
  });
  const topPhysical = Object.entries(physicalCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));
  const topEmotional = Object.entries(emotionalCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  // --- Journaling streaks ---
  const entryDates = [...new Set(
    entries.map((e) => new Date(e.created_at).toDateString())
  )].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (let i = 1; i < entryDates.length; i++) {
    const diff =
      (new Date(entryDates[i]).getTime() - new Date(entryDates[i - 1]).getTime()) / 86400000;
    if (diff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  if (entryDates.length > 0) {
    const lastDate = entryDates[entryDates.length - 1];
    if (lastDate === today || lastDate === yesterday) {
      let streak = 1;
      for (let i = entryDates.length - 2; i >= 0; i--) {
        const diff =
          (new Date(entryDates[i + 1]).getTime() - new Date(entryDates[i]).getTime()) / 86400000;
        if (diff === 1) streak++;
        else break;
      }
      currentStreak = streak;
    }
  }

  // --- Time of day ---
  const hourCounts: Record<number, number> = {};
  entries.forEach((e) => {
    const hour = new Date(e.created_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const timeData = [
    { period: "Morning (6-12)", count: 0 },
    { period: "Afternoon (12-17)", count: 0 },
    { period: "Evening (17-21)", count: 0 },
    { period: "Night (21-6)", count: 0 },
  ];
  Object.entries(hourCounts).forEach(([h, c]) => {
    const hour = Number(h);
    if (hour >= 6 && hour < 12) timeData[0].count += c;
    else if (hour >= 12 && hour < 17) timeData[1].count += c;
    else if (hour >= 17 && hour < 21) timeData[2].count += c;
    else timeData[3].count += c;
  });

  // Theme insights
  const themeInsights = insights.filter(
    (i) => i.insight_type === "theme_analysis"
  );

  async function generateWeeklySummary() {
    setGeneratingSummary(true);
    try {
      await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "weekly_summary" }),
      });
      window.location.reload();
    } catch {
      // ignore
    } finally {
      setGeneratingSummary(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Insights</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={generateWeeklySummary}
          disabled={generatingSummary}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {generatingSummary ? "Generating..." : "Generate Weekly Summary"}
        </Button>
      </div>

      {/* Streaks */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-6 text-center">
            <div className="text-3xl font-bold">{currentStreak}</div>
            <div className="text-sm text-muted-foreground">Current streak (days)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <div className="text-3xl font-bold">{longestStreak}</div>
            <div className="text-sm text-muted-foreground">Longest streak (days)</div>
          </CardContent>
        </Card>
      </div>

      {/* Mood over time */}
      {moodData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mood over time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={moodData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tickFormatter={(v) => MOOD_EMOJIS[v - 1] || ""}
                  width={30}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {moodData.length <= 1 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Add more entries with mood ratings to see mood trends.
          </CardContent>
        </Card>
      )}

      {/* Entry frequency */}
      {frequencyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entry frequency (by week)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={frequencyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis allowDecimals={false} width={30} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Mood by entry type */}
      {moodByType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average mood by entry type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={moodByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                <YAxis
                  dataKey="type"
                  type="category"
                  width={100}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <Tooltip />
                <Bar dataKey="avg" fill="var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Physical state frequency */}
      {topPhysical.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most used physical state tags</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={topPhysical.length * 36 + 20}>
              <BarChart data={topPhysical} layout="vertical">
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  dataKey="tag"
                  type="category"
                  width={90}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-3))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Emotional state frequency */}
      {topEmotional.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most used emotional state tags</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={topEmotional.length * 36 + 20}>
              <BarChart data={topEmotional} layout="vertical">
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  dataKey="tag"
                  type="category"
                  width={90}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Time of day */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">When you journal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis allowDecimals={false} width={30} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Theme analysis */}
      {themeInsights.map((insight) => {
        const themes =
          (
            insight.content as {
              themes?: { theme: string; count: number; summary: string }[];
            }
          )?.themes || [];
        return (
          <Card key={insight.id}>
            <CardHeader>
              <CardTitle className="text-base">Recurring themes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {themes.map((t, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t.theme}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.count} entries
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{t.summary}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Weekly summaries */}
      {insights
        .filter((i) => i.insight_type === "weekly_summary")
        .map((insight) => (
          <Card key={insight.id}>
            <CardHeader>
              <CardTitle className="text-base">
                Weekly Summary — {new Date(insight.period_start).toLocaleDateString()} to{" "}
                {new Date(insight.period_end).toLocaleDateString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {(insight.content as { summary?: string })?.summary || "No summary available."}
              </p>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
