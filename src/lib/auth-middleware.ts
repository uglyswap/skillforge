import { NextRequest, NextResponse } from "next/server";
import { verifyJwt, COOKIE_NAME } from "./auth";
import type { JwtPayload } from "./auth";

export function getAuthFromRequest(request: NextRequest): JwtPayload | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

export function requireAuth(
  request: NextRequest
): JwtPayload | NextResponse {
  const user = getAuthFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  return user;
}

export function requireAdmin(
  request: NextRequest
): JwtPayload | NextResponse {
  const result = requireAuth(request);
  if (result instanceof NextResponse) return result;
  if (result.role !== "admin") {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }
  return result;
}
