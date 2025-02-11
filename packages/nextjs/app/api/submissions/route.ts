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
    console.log("Received submission:", submission);

    // Validation errors object
    const errors: string[] = [];

    // Required fields validation
    if (!submission.title) errors.push("Title is required");
    if (!submission.description) errors.push("Description is required");
    if (!submission.linkToRepository) errors.push("Repository link is required");
    if (!submission.linkToVideo) errors.push("Video link is required");
    if (!submission.signature) errors.push("Signature is required");
    if (!submission.builder) errors.push("Builder address is required");
    if (!submission.upAddress) errors.push("UP address is required");

    // Length validations
    if (submission.description && submission.description.length > 750) {
      errors.push("Description must be less than 750 characters");
    }
    if (submission.feedback && submission.feedback.length > 750) {
      errors.push("Feedback must be less than 750 characters");
    }
    if (submission.title && submission.title.length > 75) {
      errors.push("Title must be less than 75 characters");
    }

    // If there are any validation errors, return them
    if (errors.length > 0) {
      console.log("Validation errors:", errors);
      return NextResponse.json({ error: "Invalid form details", details: errors }, { status: 400 });
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

    console.log("Created submission:", result);
    return NextResponse.json({ submission: result }, { status: 201 });
  } catch (error) {
    console.error("Error processing submission:", error);
    return NextResponse.json(
      {
        error: "Failed to process submission",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
