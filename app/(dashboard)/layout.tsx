import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export const dynamic = "force-dynamic";

export default async function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar businessName={business?.name ?? null} />
      <div className="flex-1">
        <MobileNav />
        <main className="p-4 sm:p-6 lg:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
