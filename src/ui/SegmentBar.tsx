// Ten segments filled to a percent: the overlay's egg warmth and growth bars, and the usage rows
// under the egg in the popup. The color comes in as a CSS value.

import "./segment-bar.css";

export function SegmentBar({ percent, color }: { percent: number; color: string }) {
  const filled = Math.max(0, Math.min(10, Math.round(percent / 10)));
  return (
    <div class="segment-bar" aria-hidden="true" style={{ "--fill": color }}>
      {Array.from({ length: 10 }, (_, index) => (
        <i key={index} class={index < filled ? "segment-on" : undefined} />
      ))}
    </div>
  );
}
