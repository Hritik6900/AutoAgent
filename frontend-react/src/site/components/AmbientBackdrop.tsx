import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';

/** A single fixed colour wash painted behind the entire document, rather than a
 *  per-section gradient.
 *
 *  The arrangement is deliberately top-heavy: one dominant bloom anchored at the top
 *  centre, with two quieter flanking fields either side, then a gradient that returns the
 *  page to paper as you go down. That keeps the colour where the eye starts on every
 *  route - and because the layer is fixed, every page inherits it for free.
 *
 *  Scrolling drives it. A fixed layer that never moves reads as wallpaper; here the
 *  dominant bloom lifts and widens as you go down while the two flanks sink and spread,
 *  and their weights trade places - so the palette you're looking at at the bottom of a
 *  page is genuinely a different mix from the one at the top, and it arrives continuously
 *  rather than in steps. Everything is driven off one spring so it lags the scroll
 *  slightly instead of tracking it rigidly.
 *
 *  Only transform and opacity are animated, so the whole thing stays on the compositor
 *  and never triggers layout. Under prefers-reduced-motion the scroll bindings are
 *  dropped entirely and the wash renders in its resting position.
 *
 *  Fixed + pointer-events-none + -z-10: it never intercepts input and never affects
 *  layout, so any page can render normally on top of it.
 */
export const AmbientBackdrop = () => {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const p = useSpring(scrollYProgress, { stiffness: 55, damping: 26, mass: 0.5 });

  // Percentages resolve against each field's own box, so these stay proportional at
  // every viewport size.
  const heroY = useTransform(p, [0, 1], ['0%', '-16%']);
  const heroScale = useTransform(p, [0, 1], [1, 1.32]);
  const heroFade = useTransform(p, [0, 1], [1, 0.72]);

  const leftY = useTransform(p, [0, 1], ['0%', '30%']);
  const leftX = useTransform(p, [0, 1], ['0%', '-10%']);
  const leftFade = useTransform(p, [0, 1], [0.75, 1]);

  const rightY = useTransform(p, [0, 1], ['0%', '24%']);
  const rightX = useTransform(p, [0, 1], ['0%', '10%']);
  const rightFade = useTransform(p, [0, 1], [0.7, 1]);

  /* The scroll transform lives on the wrapper and the idle drift keyframes live on the
     child, because both write `transform` - nesting composes them instead of one
     silently winning. */
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ opacity: 'var(--amb-strength)' }}
    >
      {/* dominant bloom, centred over the top edge */}
      <motion.div
        className="absolute -top-[34%] left-1/2 h-[86vmax] w-[86vmax]"
        style={
          reduced
            ? { x: '-50%' }
            : { x: '-50%', y: heroY, scale: heroScale, opacity: heroFade }
        }
      >
        <div
          className="amb-a h-full w-full rounded-full"
          style={{
            background: 'radial-gradient(closest-side, var(--amb-1), transparent 70%)',
            filter: 'blur(var(--amb-blur))',
          }}
        />
      </motion.div>

      {/* flanks - same family, much quieter, so the bloom has somewhere to fall off to */}
      <motion.div
        className="absolute -top-[12%] left-[-20%] h-[58vmax] w-[58vmax]"
        style={reduced ? undefined : { x: leftX, y: leftY, opacity: leftFade }}
      >
        <div
          className="amb-b h-full w-full rounded-full"
          style={{
            background: 'radial-gradient(closest-side, var(--amb-2), transparent 72%)',
            filter: 'blur(var(--amb-blur))',
          }}
        />
      </motion.div>

      <motion.div
        className="absolute -top-[4%] right-[-20%] h-[58vmax] w-[58vmax]"
        style={reduced ? undefined : { x: rightX, y: rightY, opacity: rightFade }}
      >
        <div
          className="amb-c h-full w-full rounded-full"
          style={{
            background: 'radial-gradient(closest-side, var(--amb-3), transparent 72%)',
            filter: 'blur(var(--amb-blur))',
          }}
        />
      </motion.div>

      {/* Dims the wash toward the bottom of the viewport so text over it keeps its
          contrast, without ever fully cancelling it out. This is `fixed`, so this exact
          gradient sits on screen at every scroll position, not just at the top of the
          document - a stop that reached fully opaque paper here (as it used to) meant
          the bottom ~20% of every screen, at every scroll depth, went flat solid colour
          with no bloom bleeding through at all. Capping it well short of opaque leaves a
          residual tint everywhere on screen; .section-band's own local glow (see
          index.css) carries the rest of the load for content that scrolls deep into the
          "faded" zone. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, transparent 26%, rgb(from var(--color-paper) r g b / 0.28) 55%, rgb(from var(--color-paper) r g b / 0.5) 78%, rgb(from var(--color-paper) r g b / 0.64) 100%)',
        }}
      />
    </div>
  );
};
