import { useUniversalProfile } from "~~/contexts/UniversalProfileContext";

export const useProfile = () => {
  const { profile, loading, error } = useUniversalProfile();

  return {
    profile,
    loading,
    error,
  };
};
