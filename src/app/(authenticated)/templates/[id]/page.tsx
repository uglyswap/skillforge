"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

interface TemplateDetail {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  isDefault: boolean;
}

export default function TemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await fetch(`/api/templates/${id}`);
      if (res.ok) {
        const data: TemplateDetail = await res.json();
        setTemplate(data);
        setName(data.name);
        setDescription(data.description);
        setSystemPrompt(data.systemPrompt);
        setIsDefault(data.isDefault);
      }
    } catch {
      toast.error("Erreur de chargement");
    }
  }, [id]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, systemPrompt, isDefault }),
      });

      if (res.ok) {
        toast.success("Template sauvegardé");
        if (isDefault) {
          await fetch(`/api/templates/${id}/default`, { method: "PUT" });
        }
        fetchTemplate();
      } else {
        const data: { error?: string } = await res.json();
        toast.error(data.error ?? "Erreur");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  if (!template) {
    return <p className="text-gray-500">Chargement...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/templates")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <h1 className="text-2xl font-bold">Éditer le template</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prompt système</Label>
                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="min-h-[400px] font-mono text-sm"
                    required
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                  <Label>Template par défaut</Label>
                </div>
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Variables disponibles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <code className="rounded bg-gray-100 px-1">
                  {"{{DOC_NAME}}"}
                </code>
                <p className="text-gray-500">Nom du fichier source</p>
              </div>
              <div>
                <code className="rounded bg-gray-100 px-1">
                  {"{{DOC_CONTENT}}"}
                </code>
                <p className="text-gray-500">Contenu de la documentation</p>
              </div>
              <div>
                <code className="rounded bg-gray-100 px-1">
                  {"{{SKILL_NAME}}"}
                </code>
                <p className="text-gray-500">Nom du skill demandé</p>
              </div>
              <div>
                <code className="rounded bg-gray-100 px-1">
                  {"{{CURRENT_DATE}}"}
                </code>
                <p className="text-gray-500">Date du jour (YYYY-MM-DD)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
