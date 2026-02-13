import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Esparcraft IA API - v1.0.0" });
}
