// What the overlay page, which runs in a frame on the Claude page, tells the content script
// that owns the frame. The page inside cannot move or resize its own frame.

/** The window was sized for the frame's own border: 128 x 96 plus 8 px on every side. */
export const WINDOW_WIDTH = 144;
export const WINDOW_HEIGHT = 112;

export type OverlayMessage =
  /** The space the overlay needs now. It grows when the card opens. */
  | { type: "pixiu-size"; width: number; height: number }
  /** The window is being dragged: how far the pointer is from where it took hold. */
  | { type: "pixiu-drag"; dx: number; dy: number }
  /** The drag ended. */
  | { type: "pixiu-drop" };

export function isOverlayMessage(value: unknown): value is OverlayMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  const numbers = (...keys: string[]) => keys.every((key) => Number.isFinite(message[key]));
  if (message.type === "pixiu-size") return numbers("width", "height");
  if (message.type === "pixiu-drag") return numbers("dx", "dy");
  return message.type === "pixiu-drop";
}
