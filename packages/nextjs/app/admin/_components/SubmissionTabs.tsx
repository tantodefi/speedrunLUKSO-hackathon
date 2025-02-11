"use client";

import { SubmissionCard } from "./SubmissionCard";
import { useSession } from "next-auth/react";
import { useAccount } from "wagmi";
import { Submission } from "~~/types/submission";

// Define the complete type with all required properties
type SubmissionWithAvg = Submission & {
  avgScore: number;
  totalVotes: number;
  userVote?: number;
};

const skeletonClasses = "animate-pulse bg-gray-200 rounded-none w-full h-96";

export const SubmissionTabs = ({ submissions }: { submissions: Submission[] }) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const { address: connectedAddress } = useAccount();

  const toggleVisibility = async (submissionId: string, currentVisibility: boolean) => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}/visibility`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isVisible: !currentVisibility }),
      });

      if (!response.ok) {
        throw new Error("Failed to update visibility");
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Error updating visibility:", error);
    }
  };

  const { voted, notVoted, all } = submissions.reduce(
    (acc, submission) => {
      const currentVote = submission.votes.find(vote => vote.voterId === connectedAddress);

      const avgScore =
        submission.votes.length > 0
          ? submission.votes.map(vote => vote.score).reduce((a, b) => a + b, 0) / submission.votes.length
          : 0;

      const totalVotes = submission.votes.length;
      const userVote = currentVote?.score;

      // Create submission with average score
      const submissionWithAvg: SubmissionWithAvg = {
        ...submission,
        avgScore,
        totalVotes,
        userVote,
      };

      acc.all.push(submissionWithAvg);

      if (currentVote) {
        acc.voted.push(submissionWithAvg);
      } else {
        acc.notVoted.push(submissionWithAvg);
      }

      return acc;
    },
    {
      voted: [] as SubmissionWithAvg[],
      notVoted: [] as SubmissionWithAvg[],
      all: [] as SubmissionWithAvg[],
    },
  );

  const votedLabel = connectedAddress ? `Voted (${voted.length})` : "Voted (-)";
  const notVotedLabel = connectedAddress ? `Not Voted (${notVoted.length})` : "Not Voted (-)";
  const allLabel = `All Submissions (${all.length})`;

  const renderSubmissionCard = (submission: SubmissionWithAvg, tabName: string) => (
    <div key={submission.id} className="relative">
      <SubmissionCard submission={submission} tabName={tabName} />
      {isAdmin && (
        <div className="absolute top-2 right-2">
          <button
            onClick={() => toggleVisibility(submission.id, submission.isVisible)}
            className={`btn btn-sm ${submission.isVisible ? "btn-error" : "btn-success"}`}
          >
            {submission.isVisible ? "Hide" : "Show"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl container mx-auto px-6">
      <div role="tablist" className="tabs tabs-bordered tabs-lg">
        {/* Not Voted Tab */}
        <input
          type="radio"
          name="submission_tabs"
          role="tab"
          className="tab whitespace-nowrap"
          aria-label={notVotedLabel}
          defaultChecked
        />
        <div role="tabpanel" className="tab-content py-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {!connectedAddress ? (
              <>
                <div className={skeletonClasses}></div>
                <div className={skeletonClasses}></div>
                <div className={skeletonClasses}></div>
              </>
            ) : notVoted.length === 0 ? (
              <div role="alert" className="alert col-span-2">
                <span>There are no submissions to vote on.</span>
              </div>
            ) : (
              notVoted.map(submission => renderSubmissionCard(submission, "notVoted"))
            )}
          </div>
        </div>

        {/* Voted Tab */}
        <input
          type="radio"
          name="submission_tabs"
          role="tab"
          className="tab whitespace-nowrap"
          aria-label={votedLabel}
        />
        <div role="tabpanel" className="tab-content py-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {voted.length === 0 ? (
              <div role="alert" className="alert col-span-2">
                <span>You have not voted on any submissions yet.</span>
              </div>
            ) : (
              voted.sort((a, b) => b.avgScore - a.avgScore).map(submission => renderSubmissionCard(submission, "voted"))
            )}
          </div>
        </div>

        {/* All Submissions Tab (only for admins) */}
        {isAdmin && (
          <>
            <input
              type="radio"
              name="submission_tabs"
              role="tab"
              className="tab whitespace-nowrap"
              aria-label={allLabel}
            />
            <div role="tabpanel" className="tab-content py-6">
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {all.length === 0 ? (
                  <div role="alert" className="alert col-span-2">
                    <span>There are no submissions yet.</span>
                  </div>
                ) : (
                  all.sort((a, b) => b.avgScore - a.avgScore).map(submission => renderSubmissionCard(submission, "all"))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
