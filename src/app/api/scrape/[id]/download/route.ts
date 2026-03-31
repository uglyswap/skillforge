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

  if (job.status !== "done" || !job.outputPath) {
    return NextResponse.json(
      { error: "Le fichier n'est pas encore prêt" },
      { status: 400 }
    );
  }

  if (!fs.existsSync(job.outputPath)) {
    return NextResponse.json(
      { error: "Fichier introuvable sur le disque" },
      { status: 404 }
    );
  }

  const fileBuffer = fs.readFileSync(job.outputPath);
  const isPdf = job.outputFormat === "pdf";
  const ext = isPdf ? "pdf" : "md";
  const contentType = isPdf ? "application/pdf" : "text/markdown";

  const hostname = new URL(job.url).hostname.replace(/\./g, "-");
  const filename = `${hostname}.${ext}`;

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
