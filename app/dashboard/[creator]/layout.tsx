import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCreatorBySlug } from "@/lib/creators";
import DashboardSidebar from "./DashboardSidebar";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ creator: string }>;
}) {
  const { creator: slug } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get("creator_session")?.value;

  if (!session) redirect("/members");

  const creator = getCreatorBySlug(session);
  if (!creator) redirect("/members");

  // Only allow each creator to see their own dashboard
  if (slug !== session) redirect(`/dashboard/${session}`);

  return (
    <div className="flex min-h-screen bg-[#080808]">
      <DashboardSidebar creator={creator} />
      <main className="flex-1 overflow-y-auto lg:pl-64">
        <div className="min-h-screen p-5 sm:p-7 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
