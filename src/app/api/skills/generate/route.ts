import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { generateSkill } from "@/lib/skill-generator";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) ?? "";
    const templateId = formData.get("templateId") as string;
    const provider = formData.get("provider") as string;
    const model = formData.get("model") as string;

    if (!file) {
      return NextResponse.json(
        { error: "Fichier requis" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 10 MB)" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "md" && ext !== "pdf") {
      return NextResponse.json(
        { error: "Format non supporté. Utilisez .md ou .pdf" },
        { status: 400 }
      );
    }

    if (!templateId || !provider || !model) {
      return NextResponse.json(
        { error: "Template, provider et modèle sont requis" },
        { status: 400 }
      );
    }

    let fileContent: string;

    if (ext === "md") {
      fileContent = await file.text();
    } else {
      // PDF: extract text from buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      fileContent = extractTextFromPdf(buffer);
    }

    if (!fileContent.trim()) {
      return NextResponse.json(
        { error: "Le fichier semble vide" },
        { status: 400 }
      );
    }

    const content = await generateSkill({
      userId: user.userId,
      fileName: file.name,
      fileContent,
      skillName: name,
      templateId,
      providerId: provider,
      modelId: model,
    });

    const skillNameFinal =
      name || extractSkillName(content) || file.name.replace(/\.[^.]+$/, "");

    const skill = await prisma.generatedSkill.create({
      data: {
        userId: user.userId,
        name: skillNameFinal,
        sourceDocName: file.name,
        templateId,
        content,
      },
    });

    return NextResponse.json({ id: skill.id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function extractSkillName(content: string): string {
  const match = content.match(/^name:\s*(.+)$/m);
  if (match) {
    return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

function extractTextFromPdf(buffer: Buffer): string {
  // Simple PDF text extraction — looks for text streams
  const content = buffer.toString("latin1");
  const texts: string[] = [];

  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch: RegExpExecArray | null;

  while ((streamMatch = streamRegex.exec(content)) !== null) {
    const stream = streamMatch[1];
    const textRegex = /\(([^)]*)\)/g;
    let textMatch: RegExpExecArray | null;
    while ((textMatch = textRegex.exec(stream)) !== null) {
      const text = textMatch[1].trim();
      if (text.length > 0) {
        texts.push(text);
      }
    }

    const tjRegex = /\[([^\]]*)\]\s*TJ/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(stream)) !== null) {
      const items = tjMatch[1];
      const itemTexts = items.match(/\(([^)]*)\)/g);
      if (itemTexts) {
        for (const item of itemTexts) {
          const clean = item.slice(1, -1).trim();
          if (clean.length > 0) texts.push(clean);
        }
      }
    }
  }

  return texts.join(" ");
}
