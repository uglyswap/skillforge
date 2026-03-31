import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { settingsSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const settings = await prisma.userSettings.findUnique({
    where: { userId: user.userId },
  });

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: user.userId, isActive: true },
    select: { provider: true },
  });

  const apiKeyStatus = {
    openrouter: apiKeys.some((k: { provider: string }) => k.provider === "openrouter"),
    codingplan: apiKeys.some((k: { provider: string }) => k.provider === "codingplan"),
  };

  return NextResponse.json({
    defaultProvider: settings?.defaultProvider ?? null,
    defaultModel: settings?.defaultModel ?? null,
    apiKeys: apiKeyStatus,
  });
}

export async function PUT(request: NextRequest) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const body: unknown = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { defaultProvider, defaultModel } = parsed.data;

  await prisma.userSettings.upsert({
    where: { userId: user.userId },
    update: {
      defaultProvider: defaultProvider ?? null,
      defaultModel: defaultModel ?? null,
    },
    create: {
      userId: user.userId,
      defaultProvider: defaultProvider ?? null,
      defaultModel: defaultModel ?? null,
    },
  });

  return NextResponse.json({ success: true });
}
