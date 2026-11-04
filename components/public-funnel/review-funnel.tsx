"use client";

import { useState } from "react";
import {
  Star,
  ExternalLink,
  Copy,
  Check,
  ThumbsUp,
  HeartHandshake,
} from "lucide-react";
import {
  submitPrivateFeedback,
  logFunnelEvent,
} from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Business } from "@/lib/types";

interface ReviewFunnelProps {
  business: Business;
}

export function ReviewFunnel({ business }: ReviewFunnelProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threshold = business.min_google_rating ?? 4;
  const isPositive = rating !== null && rating >= threshold;
  const isNegative = rating !== null && rating < threshold;

  function chooseRating(value: number) {
    setRating(value);
    setError(null);
    setSubmitted(false);

    if (value >= threshold) {
      // Immediately log positive redirect per operational blueprint
      logFunnelEvent({
        businessId: business.id,
        eventType: "positive_redirect",
        rating: value,
      }).catch((err) => console.error("Funnel event error:", err));
    }
  }

  async function openGoogle(draftToCopy?: string) {
    // Fire and forget logging so the browser user gesture doesn't expire before window.open
    logFunnelEvent({
      businessId: business.id,
      eventType: "positive_redirect",
      rating,
    }).catch((err) => console.error("Funnel event error:", err));

    if (draftToCopy) {
      try {
        await navigator.clipboard.writeText(draftToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard may be blocked; user can still paste manually
      }
    }

    // Attempt to open in a new tab; fallback to location.href if popup blocker intercepts
    const targetUrl = business.google_review_url;
    try {
      const win = window.open(targetUrl, "_blank", "noopener,noreferrer");
      if (!win || win.closed || typeof win.closed === "undefined") {
        window.location.href = targetUrl;
      }
    } catch {
      window.location.href = targetUrl;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await submitPrivateFeedback({
      businessId: business.id,
      customerName: form.name,
      customerContact: form.contact,
      rating: rating ?? 1,
      message: form.message,
    });
    setSubmitting(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo_url}
              alt={business.name}
              className="mb-3 h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Star className="h-8 w-8 text-primary" />
            </div>
          )}
          <h1 className="text-2xl font-semibold">{business.name}</h1>
          <p className="mt-1 text-muted-foreground">
            How was your experience today?
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {/* Stage 1 — rating selector */}
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => {
                const filled = (hovered ?? rating ?? 0) >= value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => chooseRating(value)}
                    onMouseEnter={() => setHovered(value)}
                    onMouseLeave={() => setHovered(null)}
                    className="p-1 transition-transform hover:scale-110"
                    aria-label={`${value} star${value > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={cn(
                        "h-10 w-10",
                        filled
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            {/* Stage 2A — positive branch (Google redirect) */}
            {isPositive && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <ThumbsUp className="h-5 w-5" />
                  <p className="font-medium">
                    We&apos;re so glad you had a great experience!
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="draft">Draft your review (optional)</Label>
                  <Textarea
                    id="draft"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Share a few words about your visit…"
                  />
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => openGoogle(draft.trim() || undefined)}
                >
                  {draft.trim() ? (
                    <>
                      <Copy className="h-4 w-4" /> Copy draft &amp; open Google
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" /> Share on Google
                      Reviews
                    </>
                  )}
                </Button>
                {copied && (
                  <p className="text-center text-sm text-emerald-600">
                    <Check className="mr-1 inline h-4 w-4" />
                    Review copied — paste it on Google.
                  </p>
                )}
              </div>
            )}

            {/* Stage 2B — negative/recovery branch (private form) */}
            {isNegative && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <HeartHandshake className="h-5 w-5" />
                  <p className="text-center font-medium">
                    We&apos;re sorry we missed the mark. How can we make it
                    right?
                  </p>
                </div>

                {submitted ? (
                  <div className="rounded-md bg-emerald-50 p-4 text-center text-emerald-800">
                    Thank you. Your message has been sent directly to the owner.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="Jane Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact">Phone or email</Label>
                      <Input
                        id="contact"
                        value={form.contact}
                        onChange={(e) =>
                          setForm({ ...form, contact: e.target.value })
                        }
                        placeholder="How can we reach you?"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">What happened?</Label>
                      <Textarea
                        id="message"
                        value={form.message}
                        onChange={(e) =>
                          setForm({ ...form, message: e.target.value })
                        }
                        placeholder="Tell our management what went wrong…"
                        required
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitting}
                    >
                      {submitting ? "Sending…" : "Send to management"}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Powered by ReviewBoost
        </p>
      </div>
    </div>
  );
}
