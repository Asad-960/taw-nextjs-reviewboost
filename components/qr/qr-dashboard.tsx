"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer, Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Business } from "@/lib/types";

export function QrDashboard({
  business,
  url,
}: {
  business: Business;
  url: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#111827", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(console.error);
  }, [url]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  function downloadQr() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${business.slug}-review-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="space-y-6">
      {/* Screen view */}
      <div className="print:hidden">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">QR Code &amp; Signage</h1>
            <p className="text-muted-foreground">
              Scan-to-review link for {business.name}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyLink}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button variant="outline" onClick={downloadQr} disabled={!dataUrl}>
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print table sign
            </Button>
          </div>
        </div>

        <Card className="mx-auto max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">{business.name}</CardTitle>
            <CardDescription>How did we do today?</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt="Review QR code"
                className="h-56 w-56 rounded-md border"
              />
            ) : (
              <div className="h-56 w-56 animate-pulse rounded-md border bg-muted" />
            )}
            <p className="break-all text-center text-sm text-muted-foreground">
              {url}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Printable table-tent card */}
      <div className="hidden print:block print:w-full print:m-0 print:p-8">
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-xl border-4 border-dashed border-gray-400 p-12 text-center [break-inside:avoid]">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            {business.name}
          </h1>
          <p className="mt-3 text-2xl font-medium text-gray-700">
            How was your experience today?
          </p>
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt="Review QR code"
              className="my-8 h-80 w-80"
            />
          ) : (
            <div className="my-8 h-80 w-80" />
          )}
          <p className="text-xl font-bold uppercase tracking-wider text-gray-900">
            Scan to leave your review
          </p>
          <p className="mt-3 text-sm text-gray-500">{url}</p>
        </div>
      </div>
    </div>
  );
}
