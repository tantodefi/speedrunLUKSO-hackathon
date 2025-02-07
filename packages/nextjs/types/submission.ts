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
  address: string;
  githubUrl: string;
  linkToRepository?: string;
  linkToVideo?: string;
  telegram?: string;
  feedback?: string;
  builder?: string;
  votes: Vote[];
  eligible: boolean | null;
  eligibleAdmin?: string;
  eligibleTimestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmissionWithAvg extends Submission {
  avgScore: number;
  totalVotes: number;
  userVote?: number;
}
