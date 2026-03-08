export interface AgentProfile {
  name: string;
  maxSteps: number;
  autoRunToCompletion: boolean;
  enableReview: boolean;
  allowShellExecution: boolean;
}

export const DEFAULT_PROFILE_NAME = "default";

export const DEFAULT_PROFILE: AgentProfile = {
  name: DEFAULT_PROFILE_NAME,
  maxSteps: 10,
  autoRunToCompletion: true,
  enableReview: false,
  allowShellExecution: true
};

export function getDefaultProfile(): AgentProfile {
  return { ...DEFAULT_PROFILE };
}

export function cloneAgentProfile(profile: AgentProfile): AgentProfile {
  return { ...profile };
}

export function resolveProfileMaxSteps(profile: AgentProfile | undefined): number {
  if (!profile) {
    return DEFAULT_PROFILE.maxSteps;
  }

  return profile.maxSteps;
}

export function shouldAutoRunToCompletion(profile: AgentProfile | undefined): boolean {
  if (!profile) {
    return DEFAULT_PROFILE.autoRunToCompletion;
  }

  return profile.autoRunToCompletion;
}

export function isReviewEnabled(profile: AgentProfile | undefined): boolean {
  if (!profile) {
    return DEFAULT_PROFILE.enableReview;
  }

  return profile.enableReview;
}

export function isShellExecutionAllowed(profile: AgentProfile | undefined): boolean {
  if (!profile) {
    return DEFAULT_PROFILE.allowShellExecution;
  }

  return profile.allowShellExecution;
}
