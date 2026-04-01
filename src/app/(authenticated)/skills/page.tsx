"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Download, Trash2, Eye } from "lucide-react";

interface GeneratedSkill {
  id: string;
  name: string;
  sourceDocName: string;
  templateId: string | null;
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  isDefault: boolean;
}

interface AiModel {
  id: string;
  name: string;
}

interface UserSettings {
  defaultProvider: string | null;
  defaultModel: string | null;
}

export default function SkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<GeneratedSkill[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [skillName, setSkillName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills");
      if (res.ok) {
        const data: GeneratedSkill[] = await res.json();
        setSkills(data);
      }
    } catch {
      // ignore
    }
  }, []);

  const templateIdRef = useRef(templateId);
  templateIdRef.current = templateId;

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data: Template[] = await res.json();
        setTemplates(data);
        const defaultTpl = data.find((t) => t.isDefault);
        if (defaultTpl && !templateIdRef.current) {
          setTemplateId(defaultTpl.id);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const providerRef = useRef(provider);
  providerRef.current = provider;
  const modelRef = useRef(model);
  modelRef.current = model;

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data: UserSettings = await res.json();
        setSettings(data);
        if (data.defaultProvider && !providerRef.current) {
          setProvider(data.defaultProvider);
        }
        if (data.defaultModel && !modelRef.current) {
          setModel(data.defaultModel);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchModels = useCallback(async (prov: string) => {
    try {
      const res = await fetch(`/api/models/${prov}`);
      if (res.ok) {
        const data: AiModel[] = await res.json();
        setModels(data);
      }
    } catch {
      setModels([]);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
    fetchTemplates();
    fetchSettings();
  }, [fetchSkills, fetchTemplates, fetchSettings]);

  useEffect(() => {
    if (provider) fetchModels(provider);
  }, [provider, fetchModels]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("templateId", templateId);
      formData.append("provider", provider);
      formData.append("model", model);
      if (skillName) formData.append("name", skillName);

      const res = await fetch("/api/skills/generate", {
        method: "POST",
        body: formData,
      });

      const data: { id?: string; error?: string } = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la génération");
        return;
      }

      toast.success("Skill généré !");
      setFile(null);
      setSkillName("");
      fetchSkills();
      if (data.id) router.push(`/skills/${data.id}`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Skill supprimé");
        fetchSkills();
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Skill Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">Transformez vos documentations en skills Claude Code</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Générer un skill</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Documentation (.md ou .pdf)</Label>
              <Input
                id="file"
                type="file"
                accept=".md,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="skillName">Nom du skill (optionnel)</Label>
                <Input
                  id="skillName"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="my-skill-name"
                />
              </div>

              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={templateId} onValueChange={(v) => v && setTemplateId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.isDefault ? " (défaut)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={(v) => v && setProvider(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="codingplan">Coding Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modèle</Label>
                <Select value={model} onValueChange={(v) => v && setModel(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={loading || !file}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Générer le skill
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills générés</CardTitle>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun skill généré.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Nom</th>
                    <th className="pb-2 font-medium">Source</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((skill) => (
                    <tr key={skill.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">{skill.name}</td>
                      <td className="py-3">
                        <Badge variant="secondary">{skill.sourceDocName}</Badge>
                      </td>
                      <td className="py-3">
                        {new Date(skill.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/skills/${skill.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(
                                `/api/skills/${skill.id}/download`,
                                "_blank"
                              )
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(skill.id)}
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
