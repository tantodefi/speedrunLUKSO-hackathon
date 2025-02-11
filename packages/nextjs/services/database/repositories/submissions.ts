import { db } from "../config/database";
import { InferInsertModel, InferSelectModel, desc, eq } from "drizzle-orm";
import { comments, submissions, votes } from "~~/services/database/config/schema";

export type SubmissionInsert = InferInsertModel<typeof submissions>;
type Comment = InferInsertModel<typeof comments>;
type Vote = InferInsertModel<typeof votes>;
export type Submission = InferSelectModel<typeof submissions> & { comments: Comment[]; votes: Vote[] };
export type SubmissionWithAvg = Submission & {
  avgScore: number;
};
export type SubmissionWithWinnerTag = Submission & {
  winnerTag: string | null;
};

export type CreateNewSubmissionBody = {
  title: string;
  description: string;
  telegram?: string;
  upAddress: string;
  linkToRepository: string;
  linkToVideo: string;
  feedback?: string;
  signature: string;
  builder: string;
};

export async function getAllSubmissions(includeHidden = false): Promise<Submission[]> {
  if (includeHidden) {
    return await db.query.submissions.findMany({
      with: {
        comments: true,
        votes: true,
      },
    });
  }

  return await db.query.submissions.findMany({
    with: {
      comments: true,
      votes: true,
    },
    where: eq(submissions.isVisible, true),
  });
}

export async function createSubmission(submission: SubmissionInsert): Promise<Submission> {
  const [result] = await db
    .insert(submissions)
    .values({
      ...submission,
      isVisible: false, // Default to not visible
    })
    .returning();

  return {
    ...result,
    comments: [],
    votes: [],
  };
}

export async function setEligible(submissionId: number, eligible: boolean, builderId: string) {
  return await db
    .update(submissions)
    .set({ eligible, eligibleAdmin: builderId, eligibleTimestamp: new Date() })
    .where(eq(submissions.id, submissionId));
}

export async function clearEligible(submissionId: number) {
  return await db
    .update(submissions)
    .set({ eligible: null, eligibleAdmin: null, eligibleTimestamp: null })
    .where(eq(submissions.id, submissionId));
}

export async function getSubmissionsByBuilder(builderId: string) {
  return await db.query.submissions.findMany({
    where: eq(submissions.builderId, builderId),
    with: {
      comments: true,
      votes: true,
    },
    orderBy: [desc(submissions.id)],
  });
}

export async function setSubmissionVisibility(submissionId: number, isVisible: boolean): Promise<void> {
  await db.update(submissions).set({ isVisible }).where(eq(submissions.id, submissionId));
}
