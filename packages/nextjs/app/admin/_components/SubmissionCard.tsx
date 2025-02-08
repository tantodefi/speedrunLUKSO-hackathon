"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Address } from "~~/components/scaffold-eth";
import scaffoldConfig from "~~/scaffold.config";
import { SubmissionWithAvg } from "~~/types/submission";
import { notification } from "~~/utils/scaffold-eth";

interface VoteResponse {
  message: string;
}

export const SubmissionCard = ({ submission, tabName }: { submission: SubmissionWithAvg; tabName: string }) => {
  const { votingEnabled } = scaffoldConfig;
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const postNewVote = async ({ score }: { score: number }): Promise<VoteResponse> => {
    const response = await fetch(`/api/submissions/${submission.id}/votes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ score }),
    });

    if (!response.ok) {
      throw new Error("Failed to submit vote");
    }

    return response.json();
  };

  const handleVote = async (newScore: number) => {
    try {
      if (!votingEnabled) {
        notification.error("Voting is disabled");
        return;
      }

      if (newScore < 0 || newScore > 10) {
        notification.error("Wrong score");
        return;
      }

      setIsLoading(true);
      const result = await postNewVote({ score: newScore });
      notification.success(result.message);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        notification.error(error.message);
      } else {
        notification.error("An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card w-full bg-base-100 shadow-xl">
      <div className="card-body gap-3">
        <div className="flex justify-between">
          <h2 className="card-title mb-2">{submission.title}</h2>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => (
                <input
                  type="radio"
                  name={`rating_${tabName}_${submission.id}`}
                  id={`rating_${tabName}_${submission.id}_${i + 1}`}
                  className="mask mask-star-2 bg-orange-400"
                  checked={submission.userVote === i + 1}
                  key={i}
                  onChange={() => handleVote(i + 1)}
                  disabled={isLoading}
                />
              ))}
            </div>
            {isLoading && <span className="loading loading-xs"></span>}
            {submission.userVote && submission.userVote > 0 && (
              <label
                className={`ml-auto cursor-pointer underline text-sm hover:no-underline ${
                  isLoading ? "text-gray-400 cursor-not-allowed" : ""
                }`}
                htmlFor={`rating_${tabName}_${submission.id}_0`}
                onClick={() => handleVote(0)}
              >
                Clear
              </label>
            )}
          </div>
        </div>
        <p>{submission.description}</p>
        <div className="flex gap-3 text-sm">
          <Address address={submission.builderId} />
          <a href={submission.linkToRepository} target="_blank" rel="noopener noreferrer" className="link link-primary">
            GitHub
          </a>
        </div>
        <div className="flex gap-3 text-sm">
          <span>Average: {submission.avgScore ? submission.avgScore.toFixed(2) : "No votes yet"}</span>
          <span>Total votes: {submission.totalVotes || 0}</span>
        </div>
      </div>
    </div>
  );
};
