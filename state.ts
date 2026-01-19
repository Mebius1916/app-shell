
/**
 * Service Worker Global State
 */
export const swState = {
  enabled: true,
};

export const setSwEnabled = (enabled: boolean) => {
  swState.enabled = enabled;
};
