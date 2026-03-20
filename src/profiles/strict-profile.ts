import {
  type AgentProfile,
  cloneAgentProfile,
  DEFAULT_PROFILE
} from "./default-profile.js";

export const STRICT_PROFILE_NAME = "strict";

export const STRICT_PROFILE: AgentProfile = {
  ...DEFAULT_PROFILE,
  name: STRICT_PROFILE_NAME,
  capabilityPolicy: {
    controlledSingleFileTextModification: {
      allowedPathPrefixes: ["docs/restricted/"],
      allowedTextFileExtensions: [".txt"]
    },
    controlledSingleFileTextRead: {
      allowedPathPrefixes: ["docs/restricted/"],
      allowedTextFileExtensions: [".txt"]
    },
    controlledDirectoryTextList: {
      allowedPathPrefixes: ["docs/restricted/"],
      allowedTextFileExtensions: [".txt"],
      maxEntries: 5
    }
  },
  reviewPolicy: {
    preExecutionMode: "always",
    escalation: {
      policyPathOutsideBoundary: true,
      findTextNotFound: true
    }
  }
};

export function getStrictProfile(): AgentProfile {
  return cloneAgentProfile(STRICT_PROFILE);
}
