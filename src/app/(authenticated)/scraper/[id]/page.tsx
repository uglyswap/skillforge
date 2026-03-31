"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download } from "lucide-react";

interface ScrapeJobDetail {
  id: string;
  url: string;
  status: string;
  maxDepth: number;
  followExternal: boolean;
  pagesFound: number;
  pagesScraped: number;
  currentUrl: string | null;
  outputFormat: string;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export default function ScrapeJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<ScrapeJobDetail | null>(null);
  const [error, setError] = useState("");

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/scrape/${id}`);
      if (!res.ok) {
        setError("Job introuvable");
        return;
      }
      const data: ScrapeJobDetail = await res.json();
      setJob(data);
    } catch {
      setError("Erreur réseau");
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    if (!job) return;
    if (job.status === "done" || job.status === "error") return;

    const interval = setInterval(fetchJob, 2000);
    return () => clearInterval(interval);
  }, [job, fetchJob]);

  const progressPercent =
    job && job.pagesFound > 0
      ? Math.round((job.pagesScraped / job.pagesFound) * 100)
      : 0;

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/scraper")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!job) {
    return <p className="text-gray-500">Chargement...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/scraper")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <h1 className="text-2xl font-bold">Détail du job</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="truncate text-lg">{job.url}</CardTitle>
            <Badge
              variant="secondary"
              className={
                job.status === "done"
                  ? "bg-green-100 text-green-700"
                  : job.status === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
              }
            >
              {job.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(job.status === "crawling" || job.status === "generating") && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>
                  {job.pagesScraped} / {job.pagesFound} pages
                </span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} />
              {job.currentUrl && (
                <p className="truncate text-xs text-gray-400">
                  En cours : {job.currentUrl}
                </p>
              )}
            </div>
          )}

          {job.errorMessage && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {job.errorMessage}
            </div>
          )}

          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <span className="text-gray-500">Profondeur max :</span>{" "}
              {job.maxDepth}
            </div>
            <div>
              <span className="text-gray-500">Liens externes :</span>{" "}
              {job.followExternal ? "Oui" : "Non"}
            </div>
            <div>
              <span className="text-gray-500">Format :</span>{" "}
              {job.outputFormat}
            </div>
            <div>
              <span className="text-gray-500">Créé le :</span>{" "}
              {new Date(job.createdAt).toLocaleString("fr-FR")}
            </div>
            {job.completedAt && (
              <div>
                <span className="text-gray-500">Terminé le :</span>{" "}
                {new Date(job.completedAt).toLocaleString("fr-FR")}
              </div>
            )}
          </div>

          {job.status === "done" && (
            <Button
              onClick={() =>
                window.open(`/api/scrape/${job.id}/download`, "_blank")
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
