import { NextResponse } from "next/server";
import { createSubmission, getAllSubmissions } from "~~/services/database/repositories/submissions";
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

    // Create the submission in the database
    const result = await createSubmission({
      title: submission.title,
      description: submission.description,
      telegram: submission.telegram,
      upAddress: submission.upAddress,
      linkToRepository: submission.linkToRepository,
      linkToVideo: submission.linkToVideo,
      feedback: submission.feedback,
      builderId: submission.builder,
      submissionTimestamp: new Date(),
      eligible: null,
      eligibleTimestamp: null,
      eligibleAdmin: null,
    });

    return NextResponse.json({ submission: result }, { status: 201 });
  } catch (error) {
    console.error("Error processing submission:", error);
    return NextResponse.json({ error: "Failed to process submission" }, { status: 500 });
  }
}
