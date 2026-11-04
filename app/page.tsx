import Link from "next/link";
import { Star, QrCode, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Star,
    title: "5-star routing",
    description:
      "Happy customers land directly on your Google review dialog. Unhappy ones never do.",
  },
  {
    icon: QrCode,
    title: "QR & table tents",
    description:
      "Printable, high-contrast signage turns every visit into a review opportunity.",
  },
  {
    icon: MessageSquare,
    title: "Private feedback loop",
    description:
      "Recover at-risk customers with a private form and instant owner alerts.",
  },
  {
    icon: ShieldCheck,
    title: "Google-compliant",
    description:
      "Customer-centric copy keeps you on the right side of Google's review policy.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">ReviewBoost</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Turn happy customers into{" "}
            <span className="text-primary">5-star Google reviews</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            ReviewBoost routes satisfied customers straight to your Google
            Business Profile — and quietly intercepts the unhappy ones before
            they post publicly.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">Start free trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="container pb-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title}>
                <CardContent className="pt-6">
                  <f.icon className="h-8 w-8 text-primary" />
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container flex h-16 items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} ReviewBoost</span>
          <span>Built for local service businesses.</span>
        </div>
      </footer>
    </div>
  );
}
