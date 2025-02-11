export interface Vote {
  id: string;
  score: number;
  submissionId: string;
  voterId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Submission {
  id: string;
  title: string;
  description: string;
  telegram?: string | null;
  upAddress?: string | null;
  linkToRepository: string;
  linkToVideo: string;
  feedback?: string | null;
  builderId: string;
  eligible: boolean | null;
  eligibleTimestamp?: Date | null;
  eligibleAdmin?: string | null;
  submissionTimestamp: Date;
  votes: Vote[];
  isVisible: boolean;
}

export interface SubmissionWithAvg extends Submission {
  avgScore: number;
  totalVotes: number;
  userVote?: number;
}

export interface SubmissionWithWinnerTag extends Submission {
  winnerTag: string | null;
}
