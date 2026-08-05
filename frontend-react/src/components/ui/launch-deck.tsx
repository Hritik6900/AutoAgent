import React from 'react';

/** The environment the console sits in: a night sky, a grid floor running away toward the
 *  horizon, and a huge dome of light rising from the bottom of the screen.
 *
 *  All of it is CSS. There's no image to load, nothing to hotlink, and every colour comes
 *  from a token - so in dark mode the dome is a near-white rim against near-black, and in
 *  light mode it becomes a tinted indigo shape that's actually visible on paper. Same
 *  component, no second code path.
 *
 *  `active` (the prompt is hovered or focused) lifts the dome's brightness. Opacity only,
 *  so it stays on the compositor.
 */
export const LaunchDeck: React.FC<{ active?: boolean }> = ({ active = false }) => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
    {/* --- floor ---
        The wrapper owns the perspective; the child is a flat plane tilted back about its
        own top edge. perspective-origin sits at the top so the vanishing point lands on
        the horizon rather than in the middle of the screen. */}
    <div
      className="absolute inset-x-0 bottom-0 h-[52%] overflow-hidden"
      style={{ perspective: '260px', perspectiveOrigin: '50% 0%' }}
    >
      <div
        className="deck-floor absolute -left-1/2 top-0 h-[300%] w-[200%] origin-top"
        style={{
          transform: 'rotateX(74deg)',
          // Dissolves the far end of the floor into the horizon instead of ending on a line.
          maskImage: 'linear-gradient(to bottom, transparent 0%, #000 20%, #000 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 20%, #000 100%)',
        }}
      />
    </div>

    {/* --- the dome ---
        One very large ellipse whose centre sits well below the fold, so only the top of
        its rim is on screen. The stops are tight and asymmetric: a slow build on the way
        in, a hard falloff on the way out, which is what makes it read as a lit edge rather
        than a blurred blob. The bloom underneath is a second, much softer copy. */}
    <div
      className="animate-arc-halo absolute left-1/2 h-[125vh] w-[165vw] rounded-[50%] transition-opacity duration-700"
      style={{
        top: '74%',
        background: 'radial-gradient(closest-side, transparent 62%, var(--dome-glow) 83%, transparent 97%)',
        filter: 'blur(56px)',
        opacity: active ? 1 : 0.75,
      }}
    />
    <div
      className="animate-arc-breathe absolute left-1/2 h-[125vh] w-[165vw] rounded-[50%] transition-opacity duration-700"
      style={{
        top: '74%',
        background:
          'radial-gradient(closest-side, transparent 0%, transparent 76%, var(--dome-core) 81%, var(--dome-core) 82.2%, transparent 88%)',
        filter: 'blur(9px)',
        opacity: active ? 1 : 0.82,
      }}
    />
  </div>
);
