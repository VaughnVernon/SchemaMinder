export interface SemanticVersionData {
  major: number;
  minor: number;
  patch: number;
}

export class SemanticVersion {
  /**
   * Parses a semantic version string into its components
   * @param version Version string in format "X.Y.Z"
   * @returns SemanticVersionData object or null if invalid
   */
  static parse(version: string): SemanticVersionData | null {
    const trimmed = version.trim();
    const match = trimmed.match(/^(\d+)\.(\d+)\.(\d+)$/);
    
    if (!match) {
      return null;
    }

    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10);

    // Ensure all parts are non-negative
    if (major < 0 || minor < 0 || patch < 0) {
      return null;
    }

    return { major, minor, patch };
  }

  /**
   * Formats a SemanticVersion object as a string
   * @param version SemanticVersionData object
   * @returns Formatted version string "X.Y.Z"
   */
  static format(version: SemanticVersionData): string {
    return `${version.major}.${version.minor}.${version.patch}`;
  }

  /**
   * Compares two semantic versions
   * @param a First version
   * @param b Second version
   * @returns Positive if a > b, negative if a < b, 0 if equal
   */
  static compare(a: SemanticVersionData, b: SemanticVersionData): number {
    if (a.major !== b.major) {
      return a.major - b.major;
    }
    if (a.minor !== b.minor) {
      return a.minor - b.minor;
    }
    return a.patch - b.patch;
  }

  /**
   * Checks if version a is greater than version b
   */
  static isGreater(a: SemanticVersionData, b: SemanticVersionData): boolean {
    return SemanticVersion.compare(a, b) > 0;
  }

  /**
   * Checks if version a is less than version b
   */
  static isLess(a: SemanticVersionData, b: SemanticVersionData): boolean {
    return SemanticVersion.compare(a, b) < 0;
  }

  /**
   * Checks if two versions are equal
   */
  static isEqual(a: SemanticVersionData, b: SemanticVersionData): boolean {
    return SemanticVersion.compare(a, b) === 0;
  }

  /**
   * Checks if version a is greater than or equal to version b
   */
  static isGreaterOrEqual(a: SemanticVersionData, b: SemanticVersionData): boolean {
    return SemanticVersion.compare(a, b) >= 0;
  }

  /**
   * Checks if version a is less than or equal to version b
   */
  static isLessOrEqual(a: SemanticVersionData, b: SemanticVersionData): boolean {
    return SemanticVersion.compare(a, b) <= 0;
  }

  /**
   * Increments the major version and resets minor and patch to 0
   */
  static incrementMajor(version: SemanticVersionData): SemanticVersionData {
    return {
      major: version.major + 1,
      minor: 0,
      patch: 0
    };
  }

  /**
   * Increments the minor version and resets patch to 0
   */
  static incrementMinor(version: SemanticVersionData): SemanticVersionData {
    return {
      major: version.major,
      minor: version.minor + 1,
      patch: 0
    };
  }

  /**
   * Increments the patch version
   */
  static incrementPatch(version: SemanticVersionData): SemanticVersionData {
    return {
      major: version.major,
      minor: version.minor,
      patch: version.patch + 1
    };
  }

  /**
   * Validates that a version string is in correct semantic version format
   */
  static isValid(version: string): boolean {
    return SemanticVersion.parse(version) !== null;
  }

  /**
   * Gets the next valid semantic version based on change type
   * @param current Current version
   * @param changeType Type of change: 'major', 'minor', or 'patch'
   */
  static getNextVersion(current: SemanticVersionData, changeType: 'major' | 'minor' | 'patch'): SemanticVersionData {
    switch (changeType) {
      case 'major':
        return SemanticVersion.incrementMajor(current);
      case 'minor':
        return SemanticVersion.incrementMinor(current);
      case 'patch':
        return SemanticVersion.incrementPatch(current);
      default:
        throw new Error(`Invalid change type: ${changeType}`);
    }
  }

  /**
   * Suggests the minimum required version increment based on current and proposed versions
   * @param current Current version
   * @param proposed Proposed version
   * @returns Suggested change type or null if proposed version is invalid
   */
  static suggestMinimumIncrement(current: SemanticVersionData, proposed: SemanticVersionData): 'major' | 'minor' | 'patch' | null {
    if (SemanticVersion.isLessOrEqual(proposed, current)) {
      return null; // Invalid - proposed must be greater than current
    }

    if (proposed.major > current.major) {
      return 'major';
    }
    if (proposed.minor > current.minor) {
      return 'minor';
    }
    if (proposed.patch > current.patch) {
      return 'patch';
    }

    return null; // Should not reach here if proposed > current
  }

  /**
   * Checks if two versions are compatible (same major version)
   */
  static areCompatible(a: SemanticVersionData, b: SemanticVersionData): boolean {
    return a.major === b.major;
  }

  /**
   * Sorts an array of objects with semantic version strings
   * @param items Array of objects that have a semanticVersion property
   * @returns New sorted array (does not mutate original)
   */
  static sort<T extends { semanticVersion: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      const versionA = SemanticVersion.parse(a.semanticVersion);
      const versionB = SemanticVersion.parse(b.semanticVersion);
      if (!versionA || !versionB) return 0;
      return SemanticVersion.compare(versionA, versionB);
    });
  }
}