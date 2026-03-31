import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { templateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const templates = await prisma.skillTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

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

    const template = await prisma.skillTemplate.create({
      data: {
        name,
        description,
        systemPrompt,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json(template, { status: 201 });
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
