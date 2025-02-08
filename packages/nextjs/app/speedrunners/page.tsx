import { BuildersTable } from "./_components/BuildersTable";
import { getAllSubmissions } from "~~/services/database/repositories/submissions";
import { Submission } from "~~/types/submission";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

interface BuilderStats {
  id: string;
  address: string;
  submissionCount: number;
  totalVotes: number;
  upAddress: string;
  telegram?: string;
  submissions: Submission[];
}

export const metadata = getMetadata({
  title: "Speedrunners",
  description: "Check all the builders who have submitted builds to speedrunLUKSO.",
});

// Server component for the page
const SpeedrunnersPage = async () => {
  const submissions = await getAllSubmissions();

  // Get unique builders and their submission counts
  const buildersMap = submissions.reduce(
    (acc, submission) => {
      const builderId = submission.builderId;
      if (!acc[builderId]) {
        acc[builderId] = {
          id: builderId,
          address: builderId,
          submissionCount: 0,
          totalVotes: 0,
          upAddress: submission.upAddress || builderId,
          telegram: submission.telegram || undefined,
          submissions: [],
        };
      }
      acc[builderId].submissionCount++;
      acc[builderId].totalVotes += submission.votes?.length || 0;
      acc[builderId].submissions.push({
        ...submission,
        id: String(submission.id),
        telegram: submission.telegram || undefined,
        upAddress: submission.upAddress || undefined,
        feedback: submission.feedback || undefined,
        eligibleAdmin: submission.eligibleAdmin || undefined,
        votes: submission.votes.map(vote => ({
          ...vote,
          id: `${vote.submission}_${vote.builder}`,
          submissionId: String(vote.submission),
          voterId: vote.builder,
          createdAt: vote.createdAt || new Date(),
          updatedAt: vote.createdAt || new Date(),
        })),
      });
      return acc;
    },
    {} as Record<string, BuilderStats>,
  );

  const builders = Object.values(buildersMap).sort((a, b) => b.submissionCount - a.submissionCount);

  return (
    <div className="max-w-7xl container mx-auto px-6 mt-10">
      <h1 className="text-4xl font-bold mb-8">🏃‍♂️ SpeedrunLUKSO Builders</h1>
      <BuildersTable builders={builders} />
    </div>
  );
};

export default SpeedrunnersPage;
