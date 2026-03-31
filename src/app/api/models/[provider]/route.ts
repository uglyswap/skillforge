import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getProvider } from "@/lib/ai-providers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { provider: providerId } = await params;

  const provider = getProvider(providerId);
  if (!provider) {
    return NextResponse.json(
      { error: "Provider inconnu" },
      { status: 400 }
    );
  }

  try {
    const models = await provider.listModels("");
    return NextResponse.json(models);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
