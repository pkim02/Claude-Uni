import { NextResponse } from "next/server";
import { getAllCourses } from "@/lib/store";

export async function GET() {
  const courses = getAllCourses();
  return NextResponse.json({ courses });
}
