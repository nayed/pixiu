import { useLayoutEffect, useRef } from "preact/hooks";
import { paint, type Sprite as SpriteData } from "@/lib/sprites/sprites";

type Props = {
  sprite: SpriteData;
  /** Screen pixels per sprite pixel. */
  scale: number;
  /** A description for screen readers. Leave it out for decoration. */
  label?: string;
};

/** Draws a sprite on a canvas at 1x and lets CSS scale it up with hard edges. */
export function Sprite({ sprite, scale, label }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  // Before the browser paints, so a new sprite never shows as an empty box first.
  useLayoutEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, sprite.width, sprite.height);
    paint(context, sprite);
  }, [sprite]);

  return (
    <canvas
      ref={canvas}
      class="px-sprite"
      width={sprite.width}
      height={sprite.height}
      style={{ width: `${sprite.width * scale}px`, height: `${sprite.height * scale}px` }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
