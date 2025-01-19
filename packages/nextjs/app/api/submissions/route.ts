import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { getServerSession } from "next-auth";
import scaffoldConfig from "~~/scaffold.config";
import { createBuilder, getBuilderById } from "~~/services/database/repositories/builders";
import { createSubmission, getAllSubmissions } from "~~/services/database/repositories/submissions";
import { SubmissionInsert } from "~~/services/database/repositories/submissions";
import { authOptions } from "~~/utils/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user.role !== "admin") {
      return NextResponse.json({ error: "Only admins can get all the submissions" }, { status: 401 });
    }
    const grants = await getAllSubmissions();
    return NextResponse.json(grants);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error fetching submissions" }, { status: 500 });
  }
}

export type CreateNewSubmissionBody = SubmissionInsert & { signature: `0x${string}` };

export async function POST(req: Request) {
  try {
    const { submissionsEnabled } = scaffoldConfig;
    if (!submissionsEnabled) {
      return NextResponse.json({ error: "Submissions are closed" }, { status: 403 });
    }

    const { title, description, telegram, upAddress, linkToRepository, linkToVideo, feedback, signature, builder } =
      (await req.json()) as CreateNewSubmissionBody;

    if (
      !title ||
      !description ||
      !linkToRepository ||
      !linkToVideo ||
      !signature ||
      !builder ||
      description.length > 750 ||
      (feedback && feedback.length > 750) ||
      title.length > 75
    ) {
      return NextResponse.json({ error: "Invalid form details submitted" }, { status: 400 });
    }

    const messageContent = `I hereby confirm the following submission:

Title: ${title}
Description: ${description}
Repository: ${linkToRepository}
Video: ${linkToVideo}
UP Address: ${upAddress}
Builder: ${builder}
${telegram ? `Telegram: ${telegram}` : ""}
${feedback ? `Feedback: ${feedback}` : ""}`;

    console.log("Debug - Message Content:", messageContent);
    console.log("Debug - Signature:", signature);
    console.log("Debug - Builder:", builder);

    // Try both LUKSO UP and EOA signature verification methods
    let recoveredAddress: string;

    // First try EOA verification (personal_sign)
    try {
      const messageHash = ethers.hashMessage(messageContent);
      recoveredAddress = ethers.recoverAddress(messageHash, signature as string);
    } catch {
      // If EOA verification fails, try LUKSO UP verification (eth_sign)
      try {
        const messageHex = "0x" + Buffer.from(messageContent).toString("hex");
        const messageHash = ethers.keccak256(messageHex);
        recoveredAddress = ethers.recoverAddress(messageHash, signature as string);
      } catch (e) {
        console.error("Failed to recover address:", e);
        return NextResponse.json(
          {
            error: "Failed to recover address from signature",
          },
          { status: 401 },
        );
      }
    }

    console.log("Debug - Recovered Address:", recoveredAddress);

    if (recoveredAddress.toLowerCase() !== builder.toLowerCase()) {
      return NextResponse.json(
        {
          error: "Recovered address did not match builder",
          debug: {
            recoveredAddress,
            builder,
            messageContent,
          },
        },
        { status: 401 },
      );
    }

    const builderData = await getBuilderById(builder);

    if (!builderData) {
      await createBuilder({ id: builder, role: "user" });
    }

    const submission = await createSubmission({
      title,
      description,
      telegram,
      upAddress,
      linkToRepository,
      linkToVideo,
      feedback,
      builder,
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error processing form" }, { status: 500 });
  }
}
