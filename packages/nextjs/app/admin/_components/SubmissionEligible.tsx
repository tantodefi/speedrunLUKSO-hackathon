"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { SubmissionWithAvg } from "~~/types/submission";
import { notification } from "~~/utils/scaffold-eth";

interface EligibilityResponse {
  message: string;
}

interface EligibilityRequest {
  eligible: boolean;
  clear: boolean;
}

export const SubmissionEligible = ({ submission }: { submission: SubmissionWithAvg }) => {
  const dropdownRef = useRef<HTMLDetailsElement>(null);
  const router = useRouter();

  const closeDropdown = () => {
    if (dropdownRef.current) {
      dropdownRef.current.open = false;
    }
  };

  const postNewEligible = async (request: EligibilityRequest): Promise<EligibilityResponse> => {
    const response = await fetch(`/api/submissions/${submission.id}/eligible`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error("Failed to update eligibility");
    }

    return response.json();
  };

  const setEligible = async (newEligible: boolean) => {
    try {
      const result = await postNewEligible({ eligible: newEligible, clear: false });
      closeDropdown();
      notification.success(result.message);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        notification.error(error.message);
      } else {
        notification.error("An unknown error occurred");
      }
    }
  };

  const clearEligible = async () => {
    try {
      const result = await postNewEligible({ eligible: false, clear: true });
      closeDropdown();
      notification.success(result.message);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        notification.error(error.message);
      } else {
        notification.error("An unknown error occurred");
      }
    }
  };

  return (
    <details ref={dropdownRef} className="dropdown">
      <summary className="btn btn-sm m-1">Set eligible</summary>
      <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
        <li>
          <button onClick={() => setEligible(true)}>Eligible</button>
        </li>
        <li>
          <button onClick={() => setEligible(false)}>Not eligible</button>
        </li>
        <li>
          <button onClick={clearEligible}>Clear</button>
        </li>
      </ul>
    </details>
  );
};
