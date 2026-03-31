"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, RefreshCw, Trash2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AiModel {
  id: string;
  name: string;
}

interface ApiKeyStatus {
  openrouter: boolean;
  codingplan: boolean;
}

interface UserInfo {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

interface MeResponse {
  userId: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [codingplanKey, setCodingplanKey] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({
    openrouter: false,
    codingplan: false,
  });
  const [defaultProvider, setDefaultProvider] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [models, setModels] = useState<AiModel[]>([]);
  const [savingKey, setSavingKey] = useState("");
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data: {
          defaultProvider: string | null;
          defaultModel: string | null;
          apiKeys: ApiKeyStatus;
        } = await res.json();
        setApiKeyStatus(data.apiKeys);
        if (data.defaultProvider) setDefaultProvider(data.defaultProvider);
        if (data.defaultModel) setDefaultModel(data.defaultModel);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data: MeResponse = await res.json();
        setIsAdmin(data.role === "admin");
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data: UserInfo[] = await res.json();
        setUsers(data);
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
    fetchSettings();
    fetchMe();
  }, [fetchSettings, fetchMe]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  useEffect(() => {
    if (defaultProvider) fetchModels(defaultProvider);
  }, [defaultProvider, fetchModels]);

  async function handleSaveKey(provider: "openrouter" | "codingplan") {
    const key = provider === "openrouter" ? openrouterKey : codingplanKey;
    if (!key) {
      toast.error("Clé API requise");
      return;
    }

    setSavingKey(provider);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key }),
      });

      if (res.ok) {
        toast.success("Clé API sauvegardée");
        provider === "openrouter"
          ? setOpenrouterKey("")
          : setCodingplanKey("");
        fetchSettings();
      } else {
        const data: { error?: string } = await res.json();
        toast.error(data.error ?? "Erreur");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSavingKey("");
    }
  }

  async function handleDeleteKey(provider: string) {
    try {
      const res = await fetch(`/api/settings/api-keys?provider=${provider}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Clé supprimée");
        fetchSettings();
      }
    } catch {
      toast.error("Erreur");
    }
  }

  async function handleSaveDefaults() {
    setSavingDefaults(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultProvider: defaultProvider || null,
          defaultModel: defaultModel || null,
        }),
      });
      if (res.ok) {
        toast.success("Paramètres sauvegardés");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSavingDefaults(false);
    }
  }

  async function handleRefreshModels() {
    if (!defaultProvider) return;
    setRefreshingModels(true);
    await fetchModels(defaultProvider);
    setRefreshingModels(false);
    toast.success("Liste rafraîchie");
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      const data: { error?: string } = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur");
        return;
      }

      toast.success("Utilisateur créé");
      setUserDialogOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("user");
      fetchUsers();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Utilisateur supprimé");
        fetchUsers();
      }
    } catch {
      toast.error("Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Clés API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>OpenRouter</Label>
              <Badge
                variant="secondary"
                className={
                  apiKeyStatus.openrouter
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }
              >
                {apiKeyStatus.openrouter ? "Configuré" : "Non configuré"}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={openrouterKey}
                onChange={(e) => setOpenrouterKey(e.target.value)}
                placeholder="sk-or-..."
              />
              <Button
                onClick={() => handleSaveKey("openrouter")}
                disabled={savingKey === "openrouter"}
              >
                {savingKey === "openrouter" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Sauvegarder"
                )}
              </Button>
              {apiKeyStatus.openrouter && (
                <Button
                  variant="ghost"
                  onClick={() => handleDeleteKey("openrouter")}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Coding Plan</Label>
              <Badge
                variant="secondary"
                className={
                  apiKeyStatus.codingplan
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }
              >
                {apiKeyStatus.codingplan ? "Configuré" : "Non configuré"}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={codingplanKey}
                onChange={(e) => setCodingplanKey(e.target.value)}
                placeholder="sk-sp-..."
              />
              <Button
                onClick={() => handleSaveKey("codingplan")}
                disabled={savingKey === "codingplan"}
              >
                {savingKey === "codingplan" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Sauvegarder"
                )}
              </Button>
              {apiKeyStatus.codingplan && (
                <Button
                  variant="ghost"
                  onClick={() => handleDeleteKey("codingplan")}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modèle par défaut</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={defaultProvider} onValueChange={setDefaultProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez" />
                </SelectTrigger>
                <SelectContent>
                  {apiKeyStatus.openrouter && (
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                  )}
                  {apiKeyStatus.codingplan && (
                    <SelectItem value="codingplan">Coding Plan</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Modèle</Label>
                {defaultProvider === "openrouter" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshModels}
                    disabled={refreshingModels}
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${refreshingModels ? "animate-spin" : ""}`}
                    />
                  </Button>
                )}
              </div>
              <Select value={defaultModel} onValueChange={setDefaultModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez" />
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
          <Button onClick={handleSaveDefaults} disabled={savingDefaults}>
            {savingDefaults ? "Sauvegarde..." : "Enregistrer comme défaut"}
          </Button>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gestion des utilisateurs</CardTitle>
              <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Inviter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un utilisateur</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mot de passe</Label>
                      <Input
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rôle</Label>
                      <Select
                        value={newUserRole}
                        onValueChange={setNewUserRole}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Utilisateur</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={creatingUser}>
                      {creatingUser ? "Création..." : "Créer"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Rôle</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-3">{u.email}</td>
                      <td className="py-3">
                        <Badge variant="secondary">{u.role}</Badge>
                      </td>
                      <td className="py-3">
                        {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(u.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
