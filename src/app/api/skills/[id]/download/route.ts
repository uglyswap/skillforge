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

  const filename = `${skill.name}.md`;

  return new NextResponse(skill.content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
