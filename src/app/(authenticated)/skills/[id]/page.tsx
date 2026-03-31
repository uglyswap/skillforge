"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Download, Pencil, Save } from "lucide-react";

interface SkillDetail {
  id: string;
  name: string;
  sourceDocName: string;
  templateId: string | null;
  content: string;
  createdAt: string;
}

export default function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [skill, setSkill] = useState<SkillDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSkill = useCallback(async () => {
    try {
      const res = await fetch(`/api/skills/${id}`);
      if (res.ok) {
        const data: SkillDetail = await res.json();
        setSkill(data);
        setEditContent(data.content);
      }
    } catch {
      toast.error("Erreur lors du chargement");
    }
  }, [id]);

  useEffect(() => {
    fetchSkill();
  }, [fetchSkill]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/skills/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        toast.success("Skill sauvegardé");
        setEditing(false);
        fetchSkill();
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  if (!skill) {
    return <p className="text-gray-500">Chargement...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/skills")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <h1 className="text-2xl font-bold">{skill.name}</h1>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>Source :</span>
        <Badge variant="secondary">{skill.sourceDocName}</Badge>
        <span>
          Créé le : {new Date(skill.createdAt).toLocaleDateString("fr-FR")}
        </span>
      </div>

      <div className="flex gap-2">
        {editing ? (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Éditer
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() =>
            window.open(`/api/skills/${id}/download`, "_blank")
          }
        >
          <Download className="mr-2 h-4 w-4" />
          Télécharger .md
        </Button>
        {editing && (
          <Button
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setEditContent(skill.content);
            }}
          >
            Annuler
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {editing ? "Éditeur" : "Preview"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[500px] font-mono text-sm"
            />
          ) : (
            <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-md bg-gray-50 p-4 font-mono text-sm">
              {skill.content}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
