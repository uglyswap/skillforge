import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { scrapeSchema } from "@/lib/validators";
import { crawlSite, buildMarkdownOutput, buildPdfOutput } from "@/lib/crawler";
import fs from "node:fs";
import path from "node:path";

export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const jobs = await prisma.scrapeJob.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const body: unknown = await request.json();
  const parsed = scrapeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { url, maxDepth, followExternal, outputFormat } = parsed.data;

  const job = await prisma.scrapeJob.create({
    data: {
      userId: user.userId,
      url,
      maxDepth,
      followExternal,
      outputFormat,
      status: "crawling",
    },
  });

  runCrawlJob(job.id, url, maxDepth, followExternal, outputFormat);

  return NextResponse.json({ id: job.id }, { status: 201 });
}

async function runCrawlJob(
  jobId: string,
  url: string,
  maxDepth: number,
  followExternal: boolean,
  outputFormat: "markdown" | "pdf"
): Promise<void> {
  try {
    const pages = await crawlSite({
      startUrl: url,
      maxDepth,
      followExternal,
      outputFormat,
      onProgress: async (scraped, found, currentUrl) => {
        await prisma.scrapeJob.update({
          where: { id: jobId },
          data: {
            pagesScraped: scraped,
            pagesFound: found,
            currentUrl,
          },
        });
      },
    });

    const siteTitle = pages[0]?.title ?? new URL(url).hostname;
    const markdown = buildMarkdownOutput(siteTitle, url, pages);

    const outputDir = path.resolve("output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let outputPath: string;

    if (outputFormat === "pdf") {
      await prisma.scrapeJob.update({
        where: { id: jobId },
        data: { status: "generating" },
      });
      const pdfBuffer = await buildPdfOutput(markdown);
      outputPath = path.join(outputDir, `${jobId}.pdf`);
      fs.writeFileSync(outputPath, pdfBuffer);
    } else {
      outputPath = path.join(outputDir, `${jobId}.md`);
      fs.writeFileSync(outputPath, markdown, "utf-8");
    }

    await prisma.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: "done",
        pagesScraped: pages.length,
        pagesFound: pages.length,
        outputPath,
        currentUrl: null,
        completedAt: new Date(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: "error",
        errorMessage: message,
        currentUrl: null,
      },
    });
  }
}
