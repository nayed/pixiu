// The provider-neutral shape the pet logic consumes. Nothing in here is specific to Claude.

export type UsageWindow = {
  /** Percent of the limit used. Usually 0 to 100; may exceed 100 with usage credits. */
  percent: number;
  /** ISO time of the next reset, or null when the window is not running. */
  resetsAt: string | null;
};

export type UsageFailureReason = "signed-out" | "offline" | "changed" | "not-set-up";

export type UsageReading = {
  ok: true;
  /** ISO time of the read. */
  readAt: string;
  /** Claude: the five-hour session. */
  short: UsageWindow;
  /** Claude: the weekly limit. */
  long: UsageWindow;
};

export type UsageFailure = {
  ok: false;
  readAt: string;
  reason: UsageFailureReason;
};

export type UsageSnapshot = UsageReading | UsageFailure;
