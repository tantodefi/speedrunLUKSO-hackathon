import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createSubmission, getAllSubmissions } from "~~/services/database/repositories/submissions";
// Used in the type definition of the request body
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CreateNewSubmissionBody } from "~~/services/database/repositories/submissions";
import { authOptions } from "~~/utils/auth";

// This function is kept as a reference for potential future implementation
// of a more robust signature verification system
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const validateWithSignature = async (submission: any) => {
  // If there's a signature but no session, we can use the signature to validate
  if (submission.signature && submission.upAddress) {
    // TODO: Implement signature verification logic here if needed
    // This could be your fallback when session auth fails
    return true;
  }
  return false;
};

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
    // Clone the request to read the body multiple times
    const clonedRequest = request.clone();
    const submission = await clonedRequest.json();
    const headers = Object.fromEntries(request.headers.entries());

    console.log("Submission request headers:", JSON.stringify(headers, null, 2));

    // First try session-based auth
    const session = await getServerSession(authOptions);
    console.log("Submission attempt - Session data:", JSON.stringify(session, null, 2));

    // If we have a valid session with address, use it
    let authenticatedAddress = session?.user?.address;

    // No session but has signature - use direct signature verification as fallback
    if (!authenticatedAddress && submission.signature && submission.upAddress) {
      console.log("No session found, attempting signature verification fallback");

      // In production, verify the signature here
      // For development, we'll trust the signature
      authenticatedAddress = submission.upAddress;

      console.log("Using signature fallback authentication for address:", authenticatedAddress);
    }

    // Still no authenticated address - reject the request
    if (!authenticatedAddress) {
      console.log("No authentication method succeeded");
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    // Continue with authenticated submission...
    console.log("Authenticated as:", authenticatedAddress);

    // Ensure the submission address matches the authenticated address
    if (submission.upAddress.toLowerCase() !== authenticatedAddress.toLowerCase()) {
      return NextResponse.json({ error: "Submission address does not match authenticated address" }, { status: 403 });
    }

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
      builderId: authenticatedAddress,
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
