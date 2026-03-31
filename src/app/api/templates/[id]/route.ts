import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { templateSchema } from "@/lib/validators";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const template = await prisma.skillTemplate.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json(
      { error: "Template introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json(template);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const body: unknown = await request.json();
  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, description, systemPrompt, isDefault } = parsed.data;

  try {
    if (isDefault) {
      await prisma.skillTemplate.updateMany({
        data: { isDefault: false },
      });
    }

    const updated = await prisma.skillTemplate.update({
      where: { id },
      data: { name, description, systemPrompt, isDefault: isDefault ?? false },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur interne";
    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Un template avec ce nom existe déjà" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const count = await prisma.skillTemplate.count();
  if (count <= 1) {
    return NextResponse.json(
      { error: "Impossible de supprimer le dernier template" },
      { status: 400 }
    );
  }

  await prisma.skillTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
