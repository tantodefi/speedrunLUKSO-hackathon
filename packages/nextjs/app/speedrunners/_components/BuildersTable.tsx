"use client";

import { UniversalProfileProvider } from "~~/components/UniversalProfileProvider";
import { Address } from "~~/components/scaffold-eth";
import { UniversalProviderAddress } from "~~/components/scaffold-eth/UniversalProviderAddress";

interface BuildersTableProps {
  builders: Array<{
    address: string;
    submissionCount: number;
    upAddress: string;
    telegram?: string;
  }>;
}

export const BuildersTable = ({ builders }: BuildersTableProps) => {
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
                <UniversalProfileProvider address={builder.upAddress}>
                  <a
                    href={`https://universaleverything.io/${builder.upAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80"
                  >
                    <UniversalProviderAddress address={builder.upAddress} />
                  </a>
                </UniversalProfileProvider>
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
