let authInProgress = false;
let lastAttemptTime = 0;
let lockTimeoutId: NodeJS.Timeout | null = null;
// Reserved for future implementation of a more granular locking mechanism
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isLocked = false;
const MIN_ATTEMPT_INTERVAL = 10000; // 10 seconds between attempts
const MAX_LOCK_DURATION = 30000; // 30 seconds max lock time
// Reserved for future configurable lock duration implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LOCK_DURATION = 10000; // 10 seconds

const authLock = {
  acquire: () => {
    const now = Date.now();
    if (authInProgress) {
      console.log("Auth already in progress, skipping");
      return false;
    }

    // Rate limiting check
    if (now - lastAttemptTime < MIN_ATTEMPT_INTERVAL) {
      console.log(`Rate limiting auth attempts (wait ${(MIN_ATTEMPT_INTERVAL - (now - lastAttemptTime)) / 1000}s)`);
      return false;
    }

    authInProgress = true;
    lastAttemptTime = now;

    // Auto-release the lock after MAX_LOCK_DURATION to prevent deadlocks
    if (lockTimeoutId) clearTimeout(lockTimeoutId);
    lockTimeoutId = setTimeout(() => {
      console.log("Auto-releasing auth lock after timeout");
      authInProgress = false;
    }, MAX_LOCK_DURATION);

    return true;
  },

  release: () => {
    if (lockTimeoutId) {
      clearTimeout(lockTimeoutId);
      lockTimeoutId = null;
    }
    authInProgress = false;
  },
};

export default authLock;
