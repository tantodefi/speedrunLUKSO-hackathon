import { SubmissionTabs } from "./SubmissionTabs";
import scaffoldConfig from "~~/scaffold.config";
import { getAllSubmissions } from "~~/services/database/repositories/submissions";
import { Submission } from "~~/types/submission";

export const Submissions = async () => {
  const dbSubmissions = await getAllSubmissions(true);
  const { votingEnabled } = scaffoldConfig;

  // Transform database submissions to match the expected type
  const submissions: Submission[] = dbSubmissions.map(sub => ({
    id: String(sub.id),
    title: sub.title,
    description: sub.description,
    telegram: sub.telegram || undefined,
    upAddress: sub.upAddress || undefined,
    linkToRepository: sub.linkToRepository,
    linkToVideo: sub.linkToVideo,
    feedback: sub.feedback || undefined,
    builderId: sub.builderId,
    eligible: sub.eligible,
    eligibleTimestamp: sub.eligibleTimestamp || undefined,
    eligibleAdmin: sub.eligibleAdmin || undefined,
    submissionTimestamp: sub.submissionTimestamp,
    isVisible: sub.isVisible,
    votes: sub.votes.map(vote => ({
      id: `${vote.submission}_${vote.builder}`,
      score: vote.score,
      submissionId: String(vote.submission),
      voterId: vote.builder,
      createdAt: vote.createdAt || new Date(),
      updatedAt: vote.createdAt || new Date(),
    })),
  }));

  return (
    <>
      {!votingEnabled && (
        <div className="max-w-7xl container mx-auto px-6 mb-6">
          <div className="alert alert-warning">Voting period ended</div>
        </div>
      )}
      <SubmissionTabs submissions={submissions} />
    </>
  );
};
