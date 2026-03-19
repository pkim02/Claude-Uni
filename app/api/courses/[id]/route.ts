import { NextRequest, NextResponse } from "next/server";
import { getCourse, getMaterials } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const course = getCourse(id);

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const materials = getMaterials(id);
  return NextResponse.json({ course, materials });
}
