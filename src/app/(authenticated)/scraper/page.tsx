"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Download, Trash2 } from "lucide-react";

interface ScrapeJob {
  id: string;
  url: string;
  status: string;
  maxDepth: number;
  pagesFound: number;
  pagesScraped: number;
  outputFormat: string;
  createdAt: string;
}

export default function ScraperPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [maxDepth, setMaxDepth] = useState("5");
  const [followExternal, setFollowExternal] = useState(true);
  const [outputFormat, setOutputFormat] = useState("markdown");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/scrape");
      if (res.ok) {
        const data: ScrapeJob[] = await res.json();
        setJobs(data);
      }
    } catch {
      // silently fail on fetch error
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          maxDepth: Number(maxDepth),
          followExternal,
          outputFormat,
        }),
      });

      const data: { id?: string; error?: string } = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors du lancement");
        return;
      }

      toast.success("Scraping lancé !");
      setUrl("");
      router.push(`/scraper/${data.id}`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/scrape/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Job supprimé");
        fetchJobs();
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  function statusBadgeClass(status: string): string {
    switch (status) {
      case "done":
        return "bg-green-100 text-green-700";
      case "error":
        return "bg-red-100 text-red-700";
      case "crawling":
      case "generating":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Doc Scraper</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau scraping</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL du site</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.example.com"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Profondeur max</Label>
                <Select value={maxDepth} onValueChange={(v) => v && setMaxDepth(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Format de sortie</Label>
                <Select value={outputFormat} onValueChange={(v) => v && setOutputFormat(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markdown">Markdown</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={followExternal}
                  onCheckedChange={setFollowExternal}
                />
                <Label>Liens externes</Label>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lancer le scraping
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jobs précédents</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun job pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">URL</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Pages</th>
                    <th className="pb-2 font-medium">Format</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="cursor-pointer border-b hover:bg-gray-50"
                      onClick={() => router.push(`/scraper/${job.id}`)}
                    >
                      <td className="max-w-xs truncate py-3">{job.url}</td>
                      <td className="py-3">
                        <Badge
                          variant="secondary"
                          className={statusBadgeClass(job.status)}
                        >
                          {job.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {job.pagesScraped}/{job.pagesFound}
                      </td>
                      <td className="py-3">{job.outputFormat}</td>
                      <td className="py-3">
                        {new Date(job.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {job.status === "done" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  `/api/scrape/${job.id}/download`,
                                  "_blank"
                                );
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(job.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
