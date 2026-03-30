"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ENTRY_TYPE_CONFIG, MOOD_EMOJIS } from "@/lib/types";
import type { Entry } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search as SearchIcon } from "lucide-react";
import Link from "next/link";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Entry[]>([]);
  const [searched, setSearched] = useState(false);
  const supabase = createClient();

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.rpc("search_entries", {
      search_query: q,
      p_user_id: user.id,
    });

    setResults(data || []);
    setSearched(true);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Search</h2>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search your journal..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {searched && results.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No entries found for &ldquo;{query}&rdquo;
        </p>
      )}

      <div className="space-y-2">
        {results.map((entry) => {
          const config = ENTRY_TYPE_CONFIG[entry.entry_type];
          return (
            <Link key={entry.id} href={`/entries/${entry.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{config.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {entry.title && (
                    <p className="text-sm text-foreground">{entry.title}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
