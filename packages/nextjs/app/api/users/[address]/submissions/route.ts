import { NextRequest, NextResponse } from "next/server";
import { getSubmissionsByBuilder } from "~~/services/database/repositories/submissions";

// @ts-ignore - Suppressing Next.js App Router type error for dynamic route handler
export async function GET(request: NextRequest, { params }: { params: { address: string } }) {
  try {
    const { address } = params;

    if (!address) {
      return NextResponse.json({ error: "Address not provided" }, { status: 400 });
    }

    const submissions = await getSubmissionsByBuilder(address);
    return NextResponse.json(submissions);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error fetching submissions" }, { status: 500 });
  }
}
