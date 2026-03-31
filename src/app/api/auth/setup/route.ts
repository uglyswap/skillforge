import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setAuthCookie } from "@/lib/auth";
import { setupSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const setupStatus = await prisma.setupStatus.findUnique({
      where: { id: "singleton" },
    });

    if (setupStatus?.isSetupDone) {
      return NextResponse.json(
        { error: "Le setup a déjà été effectué" },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "admin",
      },
    });

    await prisma.setupStatus.upsert({
      where: { id: "singleton" },
      update: { isSetupDone: true },
      create: { id: "singleton", isSetupDone: true },
    });

    await setAuthCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur interne";
    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
