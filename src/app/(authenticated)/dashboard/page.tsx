import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Zap, BookOpen } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [scrapeCount, skillCount, templateCount] = await Promise.all([
    prisma.scrapeJob.count({ where: { userId: user.userId } }),
    prisma.generatedSkill.count({ where: { userId: user.userId } }),
    prisma.skillTemplate.count(),
  ]);

  const recentJobs = await prisma.scrapeJob.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const stats = [
    { label: "Jobs de scraping", value: scrapeCount, icon: FileText },
    { label: "Skills générés", value: skillCount, icon: Zap },
    { label: "Templates", value: templateCount, icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Jobs récents</CardTitle>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucun job pour le moment. Lancez votre premier scraping !
            </p>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job: { id: string; url: string; status: string }) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <span className="truncate font-medium">{job.url}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      job.status === "done"
                        ? "bg-green-100 text-green-700"
                        : job.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
