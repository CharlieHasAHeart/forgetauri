export interface AgentProfile {
  name: string;
  maxSteps: number;
  autoRunToCompletion: boolean;
  enableReview: boolean;
  allowShellExecution: boolean;
  capabilityPolicy: {
    controlledSingleFileTextModification: {
      allowedPathPrefixes: string[];
      allowedTextFileExtensions: string[];
    };
    controlledSingleFileTextRead: {
      allowedPathPrefixes: string[];
      allowedTextFileExtensions: string[];
    };
    controlledDirectoryTextList: {
      allowedPathPrefixes: string[];
      allowedTextFileExtensions: string[];
      maxEntries: number;
    };
  };
  reviewPolicy: {
    preExecutionMode: "tagged_only" | "always" | "disabled";
    escalation: {
      policyPathOutsideBoundary: boolean;
      findTextNotFound: boolean;
    };
  };
}

export const DEFAULT_PROFILE_NAME = "default";

export const DEFAULT_PROFILE: AgentProfile = {
  name: DEFAULT_PROFILE_NAME,
  maxSteps: 10,
  autoRunToCompletion: true,
  enableReview: false,
  allowShellExecution: true,
  capabilityPolicy: {
    controlledSingleFileTextModification: {
      allowedPathPrefixes: ["docs/"],
      allowedTextFileExtensions: [".md", ".txt"]
    },
    controlledSingleFileTextRead: {
      allowedPathPrefixes: ["docs/"],
      allowedTextFileExtensions: [".md", ".txt"]
    },
    controlledDirectoryTextList: {
      allowedPathPrefixes: ["docs/"],
      allowedTextFileExtensions: [".md", ".txt"],
      maxEntries: 20
    }
  },
  reviewPolicy: {
    preExecutionMode: "tagged_only",
    escalation: {
      policyPathOutsideBoundary: true,
      findTextNotFound: true
    }
  }
};

export function getDefaultProfile(): AgentProfile {
  return cloneAgentProfile(DEFAULT_PROFILE);
}

export function cloneAgentProfile(profile: AgentProfile): AgentProfile {
  return {
    ...profile,
    capabilityPolicy: {
      controlledSingleFileTextModification: {
        allowedPathPrefixes: [
          ...profile.capabilityPolicy.controlledSingleFileTextModification.allowedPathPrefixes
        ],
        allowedTextFileExtensions: [
          ...profile.capabilityPolicy.controlledSingleFileTextModification.allowedTextFileExtensions
        ]
      },
      controlledSingleFileTextRead: {
        allowedPathPrefixes: [
          ...profile.capabilityPolicy.controlledSingleFileTextRead.allowedPathPrefixes
        ],
        allowedTextFileExtensions: [
          ...profile.capabilityPolicy.controlledSingleFileTextRead.allowedTextFileExtensions
        ]
      },
      controlledDirectoryTextList: {
        allowedPathPrefixes: [
          ...profile.capabilityPolicy.controlledDirectoryTextList.allowedPathPrefixes
        ],
        allowedTextFileExtensions: [
          ...profile.capabilityPolicy.controlledDirectoryTextList.allowedTextFileExtensions
        ],
        maxEntries: profile.capabilityPolicy.controlledDirectoryTextList.maxEntries
      }
    },
    reviewPolicy: {
      preExecutionMode: profile.reviewPolicy.preExecutionMode,
      escalation: {
        policyPathOutsideBoundary: profile.reviewPolicy.escalation.policyPathOutsideBoundary,
        findTextNotFound: profile.reviewPolicy.escalation.findTextNotFound
      }
    }
  };
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

let activeProfile: AgentProfile = getDefaultProfile();

export function getActiveAgentProfile(): AgentProfile {
  return cloneAgentProfile(activeProfile);
}

export function setActiveAgentProfile(profile: AgentProfile | undefined): void {
  activeProfile = profile ? cloneAgentProfile(profile) : getDefaultProfile();
}

export function resetActiveAgentProfile(): void {
  activeProfile = getDefaultProfile();
}

export function resolveControlledSingleFileCapabilityPolicy(
  profile: AgentProfile | undefined
): AgentProfile["capabilityPolicy"]["controlledSingleFileTextModification"] {
  const resolved = profile ?? getActiveAgentProfile();
  return {
    allowedPathPrefixes: [
      ...resolved.capabilityPolicy.controlledSingleFileTextModification.allowedPathPrefixes
    ],
    allowedTextFileExtensions: [
      ...resolved.capabilityPolicy.controlledSingleFileTextModification.allowedTextFileExtensions
    ]
  };
}

export function resolveControlledSingleFileTextReadPolicy(
  profile: AgentProfile | undefined
): AgentProfile["capabilityPolicy"]["controlledSingleFileTextRead"] {
  const resolved = profile ?? getActiveAgentProfile();
  return {
    allowedPathPrefixes: [
      ...resolved.capabilityPolicy.controlledSingleFileTextRead.allowedPathPrefixes
    ],
    allowedTextFileExtensions: [
      ...resolved.capabilityPolicy.controlledSingleFileTextRead.allowedTextFileExtensions
    ]
  };
}

export function resolveControlledDirectoryTextListPolicy(
  profile: AgentProfile | undefined
): AgentProfile["capabilityPolicy"]["controlledDirectoryTextList"] {
  const resolved = profile ?? getActiveAgentProfile();
  return {
    allowedPathPrefixes: [
      ...resolved.capabilityPolicy.controlledDirectoryTextList.allowedPathPrefixes
    ],
    allowedTextFileExtensions: [
      ...resolved.capabilityPolicy.controlledDirectoryTextList.allowedTextFileExtensions
    ],
    maxEntries: resolved.capabilityPolicy.controlledDirectoryTextList.maxEntries
  };
}

export function resolveReviewPreExecutionMode(
  profile: AgentProfile | undefined
): AgentProfile["reviewPolicy"]["preExecutionMode"] {
  const resolved = profile ?? getActiveAgentProfile();
  return resolved.reviewPolicy.preExecutionMode;
}

export function shouldEscalatePolicyPathOutsideBoundary(
  profile: AgentProfile | undefined
): boolean {
  const resolved = profile ?? getActiveAgentProfile();
  return resolved.reviewPolicy.escalation.policyPathOutsideBoundary;
}

export function shouldEscalateFindTextNotFound(
  profile: AgentProfile | undefined
): boolean {
  const resolved = profile ?? getActiveAgentProfile();
  return resolved.reviewPolicy.escalation.findTextNotFound;
}
