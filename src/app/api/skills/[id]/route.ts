import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const skill = await prisma.generatedSkill.findFirst({
    where: { id, userId: user.userId },
  });

  if (!skill) {
    return NextResponse.json({ error: "Skill introuvable" }, { status: 404 });
  }

  return NextResponse.json(skill);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const skill = await prisma.generatedSkill.findFirst({
    where: { id, userId: user.userId },
  });

  if (!skill) {
    return NextResponse.json({ error: "Skill introuvable" }, { status: 404 });
  }

  const body: unknown = await request.json();
  if (
    !body ||
    typeof body !== "object" ||
    !("content" in body) ||
    typeof (body as Record<string, unknown>).content !== "string"
  ) {
    return NextResponse.json(
      { error: "Contenu requis" },
      { status: 400 }
    );
  }

  const updated = await prisma.generatedSkill.update({
    where: { id },
    data: { content: (body as { content: string }).content },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const skill = await prisma.generatedSkill.findFirst({
    where: { id, userId: user.userId },
  });

  if (!skill) {
    return NextResponse.json({ error: "Skill introuvable" }, { status: 404 });
  }

  await prisma.generatedSkill.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
