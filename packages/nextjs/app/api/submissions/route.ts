import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createSubmission, getAllSubmissions } from "~~/services/database/repositories/submissions";
import type { CreateNewSubmissionBody } from "~~/services/database/repositories/submissions";
import { authOptions } from "~~/utils/auth";

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
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.address) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const submission = (await request.json()) as CreateNewSubmissionBody;
    console.log("Received submission:", JSON.stringify(submission, null, 2));

    // Validation errors object
    const errors: string[] = [];

    // Required fields validation
    const requiredFields = {
      title: submission.title,
      description: submission.description,
      linkToRepository: submission.linkToRepository,
      linkToVideo: submission.linkToVideo,
      upAddress: submission.upAddress,
    };

    // Check required fields
    Object.entries(requiredFields).forEach(([field, value]) => {
      if (!value || value.trim() === "") {
        errors.push(`${field} is required`);
      }
    });

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

    // Create the submission in the database using the authenticated user's address
    const result = await createSubmission({
      title: submission.title.trim(),
      description: submission.description.trim(),
      telegram: submission.telegram?.trim(),
      upAddress: submission.upAddress.trim(),
      linkToRepository: submission.linkToRepository.trim(),
      linkToVideo: submission.linkToVideo.trim(),
      feedback: submission.feedback?.trim(),
      builderId: session.user.address,
      submissionTimestamp: new Date(),
      eligible: null,
      eligibleTimestamp: null,
      eligibleAdmin: null,
    });

    console.log("Created submission:", JSON.stringify(result, null, 2));
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
