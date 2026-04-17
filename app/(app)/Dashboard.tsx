"use client";

import Link from "next/link";
import { ENTRY_TYPE_CONFIG, ENTRY_TYPE_COLORS, MOOD_EMOJIS } from "@/lib/types";
import type { Entry, MoodLog } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface DashboardProps {
  entries: Entry[];
  moodLogs: MoodLog[];
}

export default function Dashboard({ entries, moodLogs }: DashboardProps) {
  // Prepare mood chart data
  const moodData = [...moodLogs]
    .reverse()
    .map((log) => {
      const entry = entries.find((e) => e.id === log.entry_id);
      return {
        date: new Date(entry?.created_at || "").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        mood: log.mood_score,
      };
    });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Your Journal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Mood trend chart */}
      {moodData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mood trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={moodData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent entries */}
      <div>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Recent entries
        </h3>
        {entries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
              <p className="text-sm font-medium">No entries yet</p>
              <p className="text-sm text-muted-foreground">
                Tap the <strong>+</strong> button below to write your first entry
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const config = ENTRY_TYPE_CONFIG[entry.entry_type];
              const moodLog = moodLogs.find((m) => m.entry_id === entry.id);
              const prompts = entry.prompts as Record<string, unknown> | null;
              const preview =
                prompts?.text ||
                prompts?.happened ||
                prompts?.overall ||
                prompts?.situation ||
                "";

              return (
                <Link key={entry.id} href={`/entries/${entry.id}`}>
                  <Card className="transition-colors hover:bg-accent/50">
                    <CardContent className="flex items-center gap-4 py-3">
                      {moodLog && (
                        <span className="text-xl">
                          {MOOD_EMOJIS[moodLog.mood_score - 1]}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ENTRY_TYPE_COLORS[entry.entry_type]}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                            {" · "}
                            {new Date(entry.created_at).toLocaleTimeString(
                              "en-US",
                              { hour: "numeric", minute: "2-digit" }
                            )}
                          </span>
                        </div>
                        {preview && (
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {String(preview)}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
