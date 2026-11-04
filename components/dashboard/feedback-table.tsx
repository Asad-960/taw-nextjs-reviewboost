"use client";

import { useState, useMemo } from "react";
import { updateFeedbackStatus } from "@/app/actions/feedback";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { Search } from "lucide-react";
import type { FeedbackStatus, PrivateFeedback } from "@/lib/types";

const STATUSES: FeedbackStatus[] = ["new", "contacted", "resolved"];

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const variant =
    status === "new"
      ? "destructive"
      : status === "contacted"
        ? "warning"
        : "success";
  return <Badge variant={variant}>{status}</Badge>;
}

export function FeedbackTable({
  feedbacks,
}: {
  feedbacks: PrivateFeedback[];
}) {
  const [items, setItems] = useState<PrivateFeedback[]>(feedbacks);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  async function changeStatus(id: string, status: FeedbackStatus) {
    const prev = items;
    setItems((cur) =>
      cur.map((f) => (f.id === id ? { ...f, status } : f)),
    );
    const res = await updateFeedbackStatus({ id, status });
    if (res?.error) setItems(prev);
  }

  const filteredItems = useMemo(() => {
    return items.filter((f) => {
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (ratingFilter !== "all" && String(f.rating) !== ratingFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesName = f.customer_name.toLowerCase().includes(q);
        const matchesContact = f.customer_contact.toLowerCase().includes(q);
        const matchesMsg = f.message.toLowerCase().includes(q);
        if (!matchesName && !matchesContact && !matchesMsg) return false;
      }
      return true;
    });
  }, [items, statusFilter, ratingFilter, query]);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No feedback yet. Share your QR code or send an SMS invite to start collecting reviews.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtering Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All ({items.length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "new" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("new")}
          >
            New ({items.filter((i) => i.status === "new").length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "contacted" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("contacted")}
          >
            Contacted ({items.filter((i) => i.status === "contacted").length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "resolved" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("resolved")}
          >
            Resolved ({items.filter((i) => i.status === "resolved").length})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search feedback…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="h-9 w-28 text-xs"
          >
            <option value="all">All Stars</option>
            <option value="1">1 Star only</option>
            <option value="2">2 Stars only</option>
            <option value="3">3 Stars only</option>
          </Select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No feedback matching the selected filters.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Date</th>
                <th className="py-3 pr-4 font-medium">Rating</th>
                <th className="py-3 pr-4 font-medium">Customer</th>
                <th className="py-3 pr-4 font-medium">Contact</th>
                <th className="py-3 pr-4 font-medium">Message</th>
                <th className="py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((f) => (
                <tr key={f.id} className="border-b align-top last:border-0">
                  <td className="whitespace-nowrap py-3 pr-4">
                    {formatDateTime(f.created_at)}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-amber-500">
                    {"★".repeat(f.rating)}
                    <span className="text-muted-foreground/30">
                      {"★".repeat(5 - f.rating)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-medium">{f.customer_name}</td>
                  <td className="py-3 pr-4">{f.customer_contact}</td>
                  <td className="max-w-xs py-3 pr-4">
                    <p className="line-clamp-3">{f.message}</p>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={f.status} />
                      <Select
                        value={f.status}
                        onChange={(e) =>
                          changeStatus(f.id, e.target.value as FeedbackStatus)
                        }
                        className="h-8 w-28 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
