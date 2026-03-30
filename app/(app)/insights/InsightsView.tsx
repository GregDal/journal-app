"use client";

import type { AIInsight, MoodLog } from "@/lib/types";
import { MOOD_EMOJIS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface InsightsViewProps {
  insights: AIInsight[];
  moodLogs: (MoodLog & { entries: { created_at: string } | null })[];
}

export default function InsightsView({
  insights,
  moodLogs,
}: InsightsViewProps) {
  const moodData = moodLogs.map((log) => ({
    date: new Date(log.entries?.created_at || "").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    mood: log.mood_score,
  }));

  const themeInsights = insights.filter(
    (i) => i.insight_type === "theme_analysis"
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Insights</h2>

      {/* Mood over time */}
      {moodData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mood over time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={moodData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
                  stroke="hsl(var(--primary))"
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
            Add more entries with mood ratings to see trends here.
          </CardContent>
        </Card>
      )}

      {/* Theme analysis */}
      {themeInsights.map((insight) => {
        const themes = (insight.content as { themes?: { theme: string; count: number; summary: string }[] })?.themes || [];
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
                    <p className="text-sm text-muted-foreground">
                      {t.summary}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
