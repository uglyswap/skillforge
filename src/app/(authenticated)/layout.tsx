import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyJwt } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sf-token")?.value;

  if (!token) {
    redirect("/login");
  }

  const user = verifyJwt(token);
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={user.email} />
      <main className="flex-1 overflow-y-auto bg-background p-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
