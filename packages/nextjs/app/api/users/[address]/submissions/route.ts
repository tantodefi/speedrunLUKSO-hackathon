import { NextRequest, NextResponse } from "next/server";
import { getSubmissionsByBuilder } from "~~/services/database/repositories/submissions";

interface RouteContext {
  params: {
    address: string;
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { address } = context.params;

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
