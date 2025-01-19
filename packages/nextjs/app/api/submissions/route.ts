import { NextResponse } from "next/server";
import { ethers } from "ethers";
import scaffoldConfig from "~~/scaffold.config";
import { createBuilder, getBuilderById } from "~~/services/database/repositories/builders";
import { createSubmission, getAllSubmissions } from "~~/services/database/repositories/submissions";
import { SubmissionInsert } from "~~/services/database/repositories/submissions";

export async function GET() {
  try {
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
    let recoveredAddress: string | undefined;

    // First try EOA verification (personal_sign)
    try {
      const messageHash = ethers.hashMessage(messageContent);
      const recovered = ethers.recoverAddress(messageHash, signature as string);
      console.log("Debug - EOA verification succeeded:", recovered);
      recoveredAddress = recovered;
    } catch (e) {
      console.log("Debug - EOA verification failed, trying LUKSO UP verification");
    }

    // If EOA verification fails or address doesn't match, try LUKSO UP verification (eth_sign)
    if (!recoveredAddress || recoveredAddress.toLowerCase() !== builder.toLowerCase()) {
      try {
        const messageHex = "0x" + Buffer.from(messageContent).toString("hex");
        // For LUKSO UP (eth_sign), we need to prefix the message with "\x19Ethereum Signed Message:\n" + message.length
        const prefix = "\x19Ethereum Signed Message:\n" + messageHex.length;
        const prefixedMessageHex = "0x" + Buffer.from(prefix + messageHex.slice(2), "utf8").toString("hex");
        const messageHash = ethers.keccak256(prefixedMessageHex);
        recoveredAddress = ethers.recoverAddress(messageHash, signature as string);
        console.log("Debug - LUKSO UP verification succeeded:", recoveredAddress);
      } catch (e) {
        console.error("Debug - LUKSO UP verification failed:", e);
        return NextResponse.json(
          {
            error: "Failed to recover address from signature",
          },
          { status: 401 },
        );
      }
    }

    if (!recoveredAddress) {
      return NextResponse.json(
        {
          error: "Failed to recover any valid address",
        },
        { status: 401 },
      );
    }

    console.log("Debug - Final Recovered Address:", recoveredAddress);

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
