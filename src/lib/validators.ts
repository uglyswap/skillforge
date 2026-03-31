import { z } from "zod/v4";

export const setupSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
});

export const loginSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const scrapeSchema = z.object({
  url: z.url("URL invalide"),
  maxDepth: z.number().int().min(1).max(5).default(5),
  followExternal: z.boolean().default(true),
  outputFormat: z.enum(["markdown", "pdf"]).default("markdown"),
});

export const generateSkillSchema = z.object({
  name: z
    .string()
    .max(64)
    .regex(/^[a-z0-9-]*$/, "Kebab-case uniquement (lettres minuscules, chiffres, tirets)")
    .optional()
    .or(z.literal("")),
  templateId: z.string().min(1, "Template requis"),
  provider: z.enum(["openrouter", "codingplan"]),
  model: z.string().min(1, "Modèle requis"),
});

export const templateSchema = z.object({
  name: z.string().min(1, "Nom requis").max(100, "Nom trop long (max 100)"),
  description: z.string().max(500, "Description trop longue (max 500)"),
  systemPrompt: z.string().min(1, "Prompt système requis"),
  isDefault: z.boolean().optional(),
});

export const apiKeySchema = z.object({
  provider: z.enum(["openrouter", "codingplan"]),
  key: z.string().min(1, "Clé API requise"),
});

export const userSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
  role: z.enum(["admin", "user"]).default("user"),
});

export const settingsSchema = z.object({
  defaultProvider: z.enum(["openrouter", "codingplan"]).nullable().optional(),
  defaultModel: z.string().nullable().optional(),
});
