"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Copy, Plus } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdAt: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data: Template[] = await res.json();
        setTemplates(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          systemPrompt: newPrompt,
          isDefault: newIsDefault,
        }),
      });

      const data: { id?: string; error?: string } = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur");
        return;
      }

      toast.success("Template créé");
      setDialogOpen(false);
      setNewName("");
      setNewDescription("");
      setNewPrompt("");
      setNewIsDefault(false);
      fetchTemplates();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const data: { error?: string } = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur");
        return;
      }
      toast.success("Template supprimé");
      fetchTemplates();
    } catch {
      toast.error("Erreur réseau");
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const res = await fetch(`/api/templates/${id}`);
      if (!res.ok) return;
      const tpl: { name: string; description: string; systemPrompt: string } =
        await res.json();

      const dupRes = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${tpl.name} (copie)`,
          description: tpl.description,
          systemPrompt: tpl.systemPrompt,
        }),
      });

      if (dupRes.ok) {
        toast.success("Template dupliqué");
        fetchTemplates();
      }
    } catch {
      toast.error("Erreur réseau");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un template</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Prompt système</Label>
                <div className="rounded-md bg-blue-50 p-2 text-xs text-blue-700">
                  Variables : {"{{DOC_NAME}}"}, {"{{DOC_CONTENT}}"},{" "}
                  {"{{SKILL_NAME}}"}, {"{{CURRENT_DATE}}"}
                </div>
                <Textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={newIsDefault}
                  onCheckedChange={setNewIsDefault}
                />
                <Label>Définir comme défaut</Label>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Création..." : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun template.</p>
          ) : (
            <div className="space-y-3">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between rounded-md border p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tpl.name}</span>
                      {tpl.isDefault && (
                        <Badge variant="secondary">Défaut</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {tpl.description}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/templates/${tpl.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(tpl.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tpl.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
