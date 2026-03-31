import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import fs from "node:fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const job = await prisma.scrapeJob.findFirst({
    where: { id, userId: user.userId },
  });

  if (!job) {
    return NextResponse.json({ error: "Job introuvable" }, { status: 404 });
  }

  return NextResponse.json(job);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { id } = await params;

  const job = await prisma.scrapeJob.findFirst({
    where: { id, userId: user.userId },
  });

  if (!job) {
    return NextResponse.json({ error: "Job introuvable" }, { status: 404 });
  }

  if (job.outputPath && fs.existsSync(job.outputPath)) {
    fs.unlinkSync(job.outputPath);
  }

  await prisma.scrapeJob.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
