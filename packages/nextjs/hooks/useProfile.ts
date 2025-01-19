import { useUniversalProfile } from "~~/contexts/universal-profile/UniversalProfileContext";

export const useProfile = () => {
  const { profile, loading, error } = useUniversalProfile();

  return {
    profile,
    loading,
    error,
  };
};
