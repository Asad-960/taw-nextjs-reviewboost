"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertBusiness } from "@/app/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Business } from "@/lib/types";

export function SettingsForm({
  business,
  appUrl,
}: {
  business: Business | null;
  appUrl: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [placeId, setPlaceId] = useState(business?.google_place_id ?? "");
  const [reviewUrl, setReviewUrl] = useState(business?.google_review_url ?? "");

  function handleAutoFillUrl() {
    if (!placeId.trim()) return;
    setReviewUrl(
      `https://search.google.com/local/writereview?placeid=${placeId.trim()}`,
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const res = await upsertBusiness(formData);
    setPending(false);

    if (res?.error) {
      setError(res.error);
      return;
    }

    if (res?.message) {
      setSuccess(res.message);
    }

    if (res?.redirect) {
      router.push(res.redirect);
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business profile</CardTitle>
          <CardDescription>
            This is what your customers see on the review page.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={business?.name ?? ""}
              placeholder="Apex Dental"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">Review slug</Label>
            <Input
              id="slug"
              name="slug"
              required
              defaultValue={business?.slug ?? ""}
              placeholder="apex-dental"
            />
            <p className="text-xs text-muted-foreground">
              Your review link: {appUrl}/r/
              <span className="font-medium">
                {business?.slug ?? "your-slug"}
              </span>
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              name="logo_url"
              type="url"
              defaultValue={business?.logo_url ?? ""}
              placeholder="https://…/logo.png"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Business phone for real-time alerts</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={business?.phone ?? ""}
              placeholder="+14155552671"
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll dispatch an instant SMS alert here when a customer submits negative feedback.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Google review routing</CardTitle>
          <CardDescription>
            Where satisfied customers are sent to leave their public review.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="google_place_id">Google Place ID (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="google_place_id"
                name="google_place_id"
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="ChIJ…"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoFillUrl}
                disabled={!placeId.trim()}
              >
                Generate URL
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              If you have your Google Place ID, click Generate URL to construct your direct review link.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="google_review_url">Direct review URL</Label>
            <Input
              id="google_review_url"
              name="google_review_url"
              required
              value={reviewUrl}
              onChange={(e) => setReviewUrl(e.target.value)}
              placeholder="https://search.google.com/local/writereview?placeid=ChIJ…"
            />
            <p className="text-xs text-muted-foreground">
              Supports <code>search.google.com/local/writereview?placeid=…</code>, <code>g.page/r/…/review</code>, or Google Maps links.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="min_google_rating">
              Minimum positive rating threshold
            </Label>
            <Select
              id="min_google_rating"
              name="min_google_rating"
              defaultValue={String(business?.min_google_rating ?? 4)}
            >
              <option value="4">4 stars or above → Google (Recommended)</option>
              <option value="5">5 stars only → Google</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              Ratings below this threshold are privately captured in your feedback inbox instead.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
