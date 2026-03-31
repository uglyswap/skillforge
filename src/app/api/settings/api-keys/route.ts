import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { apiKeySchema } from "@/lib/validators";
import { encrypt } from "@/lib/encryption";

export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const body: unknown = await request.json();
  const parsed = apiKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { provider, key } = parsed.data;
  const encrypted = encrypt(key);

  await prisma.apiKey.upsert({
    where: {
      userId_provider: {
        userId: user.userId,
        provider,
      },
    },
    update: {
      keyValue: encrypted,
      isActive: true,
    },
    create: {
      userId: user.userId,
      provider,
      keyValue: encrypted,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");

  if (!provider) {
    return NextResponse.json(
      { error: "Provider requis" },
      { status: 400 }
    );
  }

  await prisma.apiKey.deleteMany({
    where: { userId: user.userId, provider },
  });

  return NextResponse.json({ success: true });
}
