import { Address } from "~~/components/scaffold-eth";
import { UniversalProviderAddress } from "~~/components/scaffold-eth/UniversalProviderAddress";
import { getAllSubmissions } from "~~/services/database/repositories/submissions";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Speedrunners",
  description: "Check all the builders who have submitted builds to speedrunLUKSO.",
});

// Client component for the builders table
("use client");
const BuildersTable = ({
  builders,
}: {
  builders: Array<{ address: string; submissionCount: number; upAddress: string; telegram?: string }>;
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            <th className="bg-primary">Builder</th>
            <th className="bg-primary">UP Address</th>
            <th className="bg-primary">Submissions</th>
            <th className="bg-primary">Telegram</th>
          </tr>
        </thead>
        <tbody>
          {builders.map(builder => (
            <tr key={builder.address} className="hover">
              <td className="p-4">
                <Address address={builder.address} />
              </td>
              <td className="p-4">
                <UniversalProviderAddress address={builder.upAddress} />
              </td>
              <td className="p-4">{builder.submissionCount}</td>
              <td className="p-4">
                {builder.telegram ? (
                  <a
                    href={`https://t.me/${builder.telegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    @{builder.telegram}
                  </a>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Server component for the page
const SpeedrunnersPage = async () => {
  const submissions = await getAllSubmissions();

  // Get unique builders and their submission counts
  const buildersMap = submissions.reduce(
    (acc, submission) => {
      if (!acc[submission.builder]) {
        acc[submission.builder] = {
          address: submission.builder,
          submissionCount: 1,
          upAddress: submission.upAddress || submission.builder,
          telegram: submission.telegram || undefined,
        };
      } else {
        acc[submission.builder].submissionCount++;
      }
      return acc;
    },
    {} as Record<string, { address: string; submissionCount: number; upAddress: string; telegram?: string }>,
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
