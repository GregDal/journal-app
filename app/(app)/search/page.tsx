"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ENTRY_TYPE_CONFIG, ENTRY_TYPE_COLORS, MOOD_EMOJIS } from "@/lib/types";
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
          placeholder="Search your journal…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
          autoFocus
        />
      </div>

      {/* Initial state */}
      {!searched && query.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <SearchIcon className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Search across all your journal entries
          </p>
        </div>
      )}

      {/* No results */}
      {searched && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm font-medium">No entries found</p>
          <p className="text-sm text-muted-foreground">
            Nothing matched &ldquo;{query}&rdquo; — try different words
          </p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-2">
        {results.map((entry) => {
          const config = ENTRY_TYPE_CONFIG[entry.entry_type];
          return (
            <Link key={entry.id} href={`/entries/${entry.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ENTRY_TYPE_COLORS[entry.entry_type]}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {entry.title && (
                    <p className="mt-1 text-sm text-foreground">{entry.title}</p>
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
