"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; text: string }
  | { type: "error"; text: string };

export function SmsForm({ disabled = false }: { disabled?: boolean }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setStatus({ type: "loading" });

    const res = await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientName: name,
        recipientPhone: phone,
        message,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus({ type: "error", text: data.error ?? "Failed to send." });
      return;
    }

    setStatus({ type: "success", text: "SMS sent successfully!" });
    setName("");
    setPhone("");
    setMessage("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Customer name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          required
          disabled={disabled || status.type === "loading"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+14155552671"
          required
          disabled={disabled || status.type === "loading"}
        />
        <p className="text-xs text-muted-foreground">
          E.164 format (+14155552671). Twilio trial accounts require verified numbers.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">
          Custom message <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Leave blank to use standard invite, or type a custom note (use {link} where review link should go)."
          disabled={disabled || status.type === "loading"}
        />
        <p className="text-xs text-muted-foreground">
          Your review link is automatically included even if you write a custom message.
        </p>
      </div>

      {status.type === "error" && (
        <p className="text-sm text-destructive">{status.text}</p>
      )}
      {status.type === "success" && (
        <p className="text-sm text-emerald-600">{status.text}</p>
      )}

      <Button type="submit" disabled={disabled || status.type === "loading"}>
        {status.type === "loading" ? "Sending…" : "Send invite"}
      </Button>
    </form>
  );
}
