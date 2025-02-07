import { NextResponse } from "next/server";
import { getAllSubmissions } from "~~/services/database/repositories/submissions";
import type { CreateNewSubmissionBody } from "~~/services/database/repositories/submissions";

export async function GET() {
  try {
    const grants = await getAllSubmissions();
    return NextResponse.json(grants);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error fetching submissions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const submission = (await request.json()) as CreateNewSubmissionBody;

    // Basic validation
    if (
      !submission.title ||
      !submission.description ||
      !submission.linkToRepository ||
      !submission.linkToVideo ||
      !submission.signature ||
      !submission.builder ||
      submission.description.length > 750 ||
      (submission.feedback && submission.feedback.length > 750) ||
      submission.title.length > 75
    ) {
      return NextResponse.json({ error: "Invalid form details submitted" }, { status: 400 });
    }

    // TODO: Add your submission handling logic here
    // For now, just return success with the submission
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("Error processing submission:", error);
    return NextResponse.json({ error: "Failed to process submission" }, { status: 500 });
  }
}
