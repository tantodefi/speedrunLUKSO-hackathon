"use client";

import { Address } from "@/components/scaffold-eth";
import { UniversalProviderAddress } from "@/components/scaffold-eth/UniversalProviderAddress";
import { SubmissionWithWinnerTag } from "~~/services/database/repositories/submissions";

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const SubmissionCard: React.FC<{ submission: SubmissionWithWinnerTag }> = ({ submission }) => {
  return (
    <div key={submission.id} className="card bg-base-200 text-secondary-content border border-gray-300 rounded-none">
      <div className="card-body p-4 pt-6">
        {submission.winnerTag && (
          <div className={`badge p-4 ${submission.winnerTag === "Winner" ? "badge-success" : "badge-warning"}`}>
            {submission.winnerTag}
          </div>
        )}
        <h2 className="card-title mb-3 xl:text-2xl">{submission.title}</h2>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="mt-1 flex shrink-0 gap-3">
            {submission.linkToRepository && isValidUrl(submission.linkToRepository) && (
              <a href={submission.linkToRepository} className="inline-block" target="_blank" rel="noopener noreferrer">
                <img alt="github icon" className="w-6 h-6" src="/icon-github.svg" />
              </a>
            )}

            {submission.linkToVideo && isValidUrl(submission.linkToVideo) && (
              <a href={submission.linkToVideo} className="inline-block" target="_blank" rel="noopener noreferrer">
                <img alt="youtube icon" className="w-6 h-6" src="/icon-youtube.svg" />
              </a>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="font-bold">Builder:</span>
              <Address address={submission.builderId} />
            </div>
            {submission.upAddress && (
              <div className="flex items-center gap-1">
                <span className="font-bold">UP Address:</span>
                <a
                  href={`https://universaleverything.io/${submission.upAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80"
                >
                  <div>
                    <UniversalProviderAddress address={submission.upAddress} />
                  </div>
                </a>
              </div>
            )}
          </div>
        </div>

        <p style={{ wordBreak: "break-word" }}>{submission.description}</p>
      </div>
    </div>
  );
};
