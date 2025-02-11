import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { setSubmissionVisibility } from "~~/services/database/repositories/submissions";
import { authOptions } from "~~/utils/auth";

export async function POST(req: NextRequest, { params }: { params: { submissionId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user.role !== "admin") {
      return NextResponse.json({ error: "Only admins can change submission visibility" }, { status: 401 });
    }

    const { submissionId } = params;
    const { isVisible } = (await req.json()) as { isVisible: boolean };

    await setSubmissionVisibility(parseInt(submissionId), isVisible);

    return NextResponse.json({ message: `Visibility set to ${isVisible}` }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error processing request" }, { status: 500 });
  }
}
