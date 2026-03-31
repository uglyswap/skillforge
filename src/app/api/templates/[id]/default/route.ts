import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  await prisma.skillTemplate.updateMany({
    data: { isDefault: false },
  });

  await prisma.skillTemplate.update({
    where: { id },
    data: { isDefault: true },
  });

  return NextResponse.json({ success: true });
}
