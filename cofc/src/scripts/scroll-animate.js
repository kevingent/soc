/**
 * scroll-animate.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Data-attribute scroll animation system powered by GSAP ScrollTrigger.
 *
 * USAGE
 * ─────
 * Add  data-animate="<preset>"  to any element.
 * The element animates in once when it enters the viewport.
 *
 * PRESETS
 * ───────
 *   fade-up      Fade in + rise from below
 *   fade-down    Fade in + drop from above
 *   fade-left    Fade in + slide from left
 *   fade-right   Fade in + slide from right
 *   fade         Simple opacity fade
 *   scale-up     Fade in + scale from 90%
 *   scale-down   Fade in + scale from 110%
 *   blur-in      Fade in + blur clears
 *   scramble     Scramble-text reveal (text elements only)
 *
 * OPTIONAL DATA ATTRIBUTES
 * ─────────────────────────
 *   data-animate-start    ScrollTrigger start  (default: "top 88%")
 *   data-animate-end      ScrollTrigger end    (default: "top 60%")
 *   data-animate-duration Duration in seconds  (default: 0.8)
 *   data-animate-delay    Delay in seconds     (default: 0)
 *   data-animate-ease     GSAP ease string     (default: "power2.out")
 *   data-animate-scrub    If present, scrubs animation to scroll position
 *
 * EXAMPLES
 * ─────────
 *   <h2 data-animate="fade-up">Hello</h2>
 *   <div data-animate="scale-up" data-animate-delay="0.2" data-animate-duration="1.2">…</div>
 *   <p  data-animate="scramble">Decrypt me</p>
 *   <section data-animate="fade-left" data-animate-start="top 70%" data-animate-end="top 30%">…</section>
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─── Preset definitions ───────────────────────────────────────────────────────
// Each preset returns { from, to } GSAP vars.
// "from" is the hidden state; "to" is the visible (animated-in) state.

const PRESETS = {
  "fade-up": {
    from: { opacity: 0, y: 40 },
    to:   { opacity: 1, y: 0  },
  },
  "fade-down": {
    from: { opacity: 0, y: -40 },
    to:   { opacity: 1, y: 0   },
  },
  "fade-left": {
    from: { opacity: 0, x: -50 },
    to:   { opacity: 1, x: 0   },
  },
  "fade-right": {
    from: { opacity: 0, x: 50 },
    to:   { opacity: 1, x: 0  },
  },
  "fade": {
    from: { opacity: 0 },
    to:   { opacity: 1 },
  },
  "scale-up": {
    from: { opacity: 0, scale: 0.9 },
    to:   { opacity: 1, scale: 1   },
  },
  "scale-down": {
    from: { opacity: 0, scale: 1.1 },
    to:   { opacity: 1, scale: 1   },
  },
  "blur-in": {
    from: { opacity: 0, filter: "blur(12px)" },
    to:   { opacity: 1, filter: "blur(0px)"  },
  },
};

// ─── Scramble-text helper ─────────────────────────────────────────────────────

function runScramble(el, duration = 0.8) {
  const original = el.textContent;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const totalFrames = Math.round(duration * 60);
  let frame = 0;

  const tick = () => {
    const progress      = frame / totalFrames;
    const revealedCount = Math.floor(progress * original.length);

    el.textContent =
      original.slice(0, revealedCount) +
      original.slice(revealedCount).replace(/\S/g, () =>
        chars[Math.floor(Math.random() * chars.length)]
      );

    frame++;
    if (frame <= totalFrames) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = original;
    }
  };

  requestAnimationFrame(tick);
}

// ─── Main init ────────────────────────────────────────────────────────────────

export function initScrollAnimations() {
  const elements = document.querySelectorAll("[data-animate]");

  elements.forEach((el) => {
    const preset    = el.dataset.animate;
    const start     = el.dataset.animateStart    ?? "top 88%";
    const end       = el.dataset.animateEnd      ?? "top 60%";
    const duration  = parseFloat(el.dataset.animateDuration ?? "0.8");
    const delay     = parseFloat(el.dataset.animateDelay    ?? "0");
    const ease      = el.dataset.animateEase     ?? "power2.out";
    const scrub     = el.hasAttribute("data-animate-scrub");

    // ── Scramble preset (text-only, no gsap.fromTo) ──
    if (preset === "scramble") {
      ScrollTrigger.create({
        trigger: el,
        start,
        once: true,
        onEnter: () => {
          setTimeout(() => runScramble(el, duration), delay * 1000);
        },
      });
      return;
    }

    // ── Standard presets ──
    const config = PRESETS[preset];
    if (!config) {
      console.warn(`[scroll-animate] Unknown preset: "${preset}"`);
      return;
    }

    // Set the element to its "from" state immediately so there's no flash
    gsap.set(el, config.from);

    const scrollTriggerConfig = {
      trigger: el,
      start,
      end,
      once: !scrub,
      ...(scrub ? { scrub: 1 } : {}),
    };

    gsap.to(el, {
      ...config.to,
      duration,
      delay,
      ease,
      scrollTrigger: scrollTriggerConfig,
    });
  });
}
