export const AVAILABLE_ANIMATIONS = [
  'stagger-left', 'stagger-right', 'stagger-up', 'stagger-down', 'zoom-in',
  'fade-blur', 'typewriter', 'flip', 'wave', 'bounce',
  'spiral-in', 'slide-rotate', 'elastic-pop', 'glitch', 'reveal-left',
  'reveal-right', 'reveal-up', 'reveal-down', 'scale-rotate', 'swing',
  'drop-shadow', 'unfold', 'stretch-x', 'pop-glow', 'fade-scale-up',
  'roll-left', 'curtain', 'shutter', 'pulse-grow', 'morph',
  'tilt-forward', 'skew-in', 'float-gentle', 'drift-right', 'zoom-out',
  'wobble-in', 'flash-reveal', 'ripple-in', 'split-in', 'cascade-down',
  'tornado-spin', 'spring-bounce', 'accordion-open', 'domino-fall', 'meteor-strike',
  'dissolve-in', 'swirl-in', 'radar-sweep', 'heartbeat-pop', 'kaleidoscope'
];

const ANIMATION_CSS = {
  // 1
  'stagger-left': `
    @keyframes anim {
        from { opacity: 0; transform: translateX(-80px); }
        to   { opacity: 1; transform: translateX(0); }
    }
    .anim-item { animation: anim 0.7s ease-out both; }
  `,
  // 2
  'stagger-right': `
    @keyframes anim {
        from { opacity: 0; transform: translateX(80px); }
        to   { opacity: 1; transform: translateX(0); }
    }
    .anim-item { animation: anim 0.7s ease-out both; }
  `,
  // 3
  'stagger-up': `
    @keyframes anim {
        from { opacity: 0; transform: translateY(60px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    .anim-item { animation: anim 0.7s ease-out both; }
  `,
  // 4
  'stagger-down': `
    @keyframes anim {
        from { opacity: 0; transform: translateY(-60px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    .anim-item { animation: anim 0.7s ease-out both; }
  `,
  // 5
  'zoom-in': `
    @keyframes anim {
        from { opacity: 0; transform: scale(0.5); }
        to   { opacity: 1; transform: scale(1); }
    }
    .anim-item { animation: anim 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
  `,
  // 6
  'fade-blur': `
    @keyframes anim {
        from { opacity: 0; filter: blur(12px); }
        to   { opacity: 1; filter: blur(0); }
    }
    .anim-item { animation: anim 0.8s ease-in-out both; }
  `,
  // 7
  'typewriter': `
    @keyframes anim {
        from { opacity: 0; transform: translateX(-20px); filter: blur(4px); }
        to   { opacity: 1; transform: translateX(0); filter: blur(0); }
    }
    .anim-item { animation: anim 0.5s linear both; }
  `,
  // 8
  'flip': `
    @keyframes anim {
        from { opacity: 0; transform: perspective(600px) rotateY(-90deg); }
        to   { opacity: 1; transform: perspective(600px) rotateY(0); }
    }
    .anim-item { animation: anim 0.8s ease-out both; }
  `,
  // 9
  'wave': `
    @keyframes anim {
        0%   { opacity: 0; transform: translateY(40px) scale(0.9); }
        60%  { opacity: 1; transform: translateY(-10px) scale(1.02); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    .anim-item { animation: anim 0.7s ease-out both; }
  `,
  // 10
  'bounce': `
    @keyframes anim {
        0%   { opacity: 0; transform: translateY(-100px); }
        50%  { opacity: 1; transform: translateY(15px); }
        70%  { opacity: 1; transform: translateY(-8px); }
        100% { opacity: 1; transform: translateY(0); }
    }
    .anim-item { animation: anim 1s cubic-bezier(0.22, 0.61, 0.36, 1) both; }
  `,
  // 11
  'spiral-in': `
    @keyframes anim {
        from { opacity: 0; transform: rotate(-180deg) scale(0.3); }
        to   { opacity: 1; transform: rotate(0) scale(1); }
    }
    .anim-item { animation: anim 0.9s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
  `,
  // 12
  'slide-rotate': `
    @keyframes anim {
        from { opacity: 0; transform: translateX(-60px) rotate(-5deg); }
        to   { opacity: 1; transform: translateX(0) rotate(0); }
    }
    .anim-item { animation: anim 0.7s ease-out both; }
  `,
  // 13
  'elastic-pop': `
    @keyframes anim {
        0%   { opacity: 0; transform: scale(0.1); }
        70%  { opacity: 1; transform: scale(1.15); }
        100% { opacity: 1; transform: scale(1); }
    }
    .anim-item { animation: anim 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) both; }
  `,
  // 14
  'glitch': `
    @keyframes anim {
        0%   { opacity: 0; transform: translateX(0); }
        10%  { opacity: 0.5; transform: translateX(-10px); }
        20%  { opacity: 0.7; transform: translateX(10px); }
        30%  { opacity: 0.8; transform: translateX(-5px); }
        100% { opacity: 1; transform: translateX(0); }
    }
    .anim-item { animation: anim 0.5s ease-out both; }
  `,
  // 15
  'reveal-left': `
    @keyframes anim {
        from { opacity: 0; clip-path: inset(0 100% 0 0); }
        to   { opacity: 1; clip-path: inset(0 0 0 0); }
    }
    .anim-item { animation: anim 0.8s ease-in-out both; }
  `,
  // 16
  'reveal-right': `
    @keyframes anim {
        from { opacity: 0; clip-path: inset(0 0 0 100%); }
        to   { opacity: 1; clip-path: inset(0 0 0 0); }
    }
    .anim-item { animation: anim 0.8s ease-in-out both; }
  `,
  // 17
  'reveal-up': `
    @keyframes anim {
        from { opacity: 0; clip-path: inset(100% 0 0 0); }
        to   { opacity: 1; clip-path: inset(0 0 0 0); }
    }
    .anim-item { animation: anim 0.8s ease-in-out both; }
  `,
  // 18
  'reveal-down': `
    @keyframes anim {
        from { opacity: 0; clip-path: inset(0 0 100% 0); }
        to   { opacity: 1; clip-path: inset(0 0 0 0); }
    }
    .anim-item { animation: anim 0.8s ease-in-out both; }
  `,
  // 19
  'scale-rotate': `
    @keyframes anim {
        from { opacity: 0; transform: scale(0.3) rotate(-15deg); }
        to   { opacity: 1; transform: scale(1) rotate(0); }
    }
    .anim-item { animation: anim 0.7s cubic-bezier(0.25, 1, 0.5, 1) both; }
  `,
  // 20
  'swing': `
    @keyframes anim {
        0%   { opacity: 0; transform: rotate(-15deg); transform-origin: top; }
        60%  { opacity: 1; transform: rotate(5deg); transform-origin: top; }
        100% { opacity: 1; transform: rotate(0); transform-origin: top; }
    }
    .anim-item { animation: anim 0.8s ease-in-out both; }
  `,
  // 21
  'drop-shadow': `
    @keyframes anim {
        from { opacity: 0; transform: translateY(-50px); filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
        to   { opacity: 1; transform: translateY(0); filter: drop-shadow(0 10px 8px rgba(0,0,0,0.3)); }
    }
    .anim-item { animation: anim 0.7s ease-out both; }
  `,
  // 22
  'unfold': `
    @keyframes anim {
        from { opacity: 0; transform: scaleY(0); transform-origin: top; }
        to   { opacity: 1; transform: scaleY(1); transform-origin: top; }
    }
    .anim-item { animation: anim 0.6s cubic-bezier(0.215, 0.61, 0.355, 1) both; }
  `,
  // 23
  'stretch-x': `
    @keyframes anim {
        from { opacity: 0; transform: scaleX(0); transform-origin: center; }
        to   { opacity: 1; transform: scaleX(1); transform-origin: center; }
    }
    .anim-item { animation: anim 0.6s ease-out both; }
  `,
  // 24
  'pop-glow': `
    @keyframes anim {
        0%   { opacity: 0; transform: scale(0.5); text-shadow: 0 0 0 rgba(255,255,255,0); }
        70%  { opacity: 1; transform: scale(1.05); text-shadow: 0 0 15px rgba(255,255,255,0.8); }
        100% { opacity: 1; transform: scale(1); text-shadow: 0 0 0 rgba(255,255,255,0); }
    }
    .anim-item { animation: anim 0.8s ease-in-out both; }
  `,
  // 25
  'fade-scale-up': `
    @keyframes anim {
        from { opacity: 0; transform: scale(0.9); }
        to   { opacity: 1; transform: scale(1); }
    }
    .anim-item { animation: anim 0.7s ease-out both; }
  `,
  // 26
  'roll-left': `
    @keyframes anim {
        from { opacity: 0; transform: translateX(-100px) rotate(-360deg); }
        to   { opacity: 1; transform: translateX(0) rotate(0); }
    }
    .anim-item { animation: anim 0.9s ease-out both; }
  `,
  // 27
  'curtain': `
    @keyframes anim {
        from { opacity: 0; clip-path: polygon(0 0, 0 0, 0 100%, 0% 100%); }
        to   { opacity: 1; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
    }
    .anim-item { animation: anim 0.9s cubic-bezier(0.77, 0, 0.175, 1) both; }
  `,
  // 28
  'shutter': `
    @keyframes anim {
        from { opacity: 0; transform: scaleY(0); }
        to   { opacity: 1; transform: scaleY(1); }
    }
    .anim-item { animation: anim 0.7s step-end both; }
  `,
  // 29
  'pulse-grow': `
    @keyframes anim {
        0%   { opacity: 0; transform: scale(0.8); }
        50%  { opacity: 1; transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
    }
    .anim-item { animation: anim 0.8s ease-in-out both; }
  `,
  // 30
  'morph': `
    @keyframes anim {
        0%   { opacity: 0; transform: skewX(10deg); }
        100% { opacity: 1; transform: skewX(0); }
    }
    .anim-item { animation: anim 0.6s ease-out both; }
  `,
  // 31
  'tilt-forward': `
    @keyframes anim {
        from { opacity: 0; transform: perspective(500px) rotateX(-30deg); }
        to   { opacity: 1; transform: perspective(500px) rotateX(0); }
    }
    .anim-item { animation: anim 0.8s ease-out both; }
  `,
  // 32
  'skew-in': `
    @keyframes anim {
        from { opacity: 0; transform: skewY(-8deg) translateX(-40px); }
        to   { opacity: 1; transform: skewY(0) translateX(0); }
    }
    .anim-item { animation: anim 0.7s ease-out both; }
  `,
  // 33
  'float-gentle': `
    @keyframes anim {
        from { opacity: 0; transform: translateY(30px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    .anim-item { animation: anim 1.2s cubic-bezier(0.25, 1, 0.5, 1) both; }
  `,
  // 34
  'drift-right': `
    @keyframes anim {
        from { opacity: 0; transform: translateX(-120px); }
        to   { opacity: 1; transform: translateX(0); }
    }
    .anim-item { animation: anim 1.2s ease-out both; }
  `,
  // 35
  'zoom-out': `
    @keyframes anim {
        from { opacity: 0; transform: scale(1.5); }
        to   { opacity: 1; transform: scale(1); }
    }
    .anim-item { animation: anim 0.8s ease-out both; }
  `,
  // 36
  'wobble-in': `
    @keyframes anim {
        0%   { opacity: 0; transform: translateX(-30px); }
        40%  { opacity: 1; transform: translateX(10px); }
        60%  { opacity: 1; transform: translateX(-10px); }
        80%  { opacity: 1; transform: translateX(5px); }
        100% { opacity: 1; transform: translateX(0); }
    }
    .anim-item { animation: anim 0.9s ease-out both; }
  `,
  // 37
  'flash-reveal': `
    @keyframes anim {
        0%   { opacity: 0; filter: brightness(3); }
        50%  { opacity: 1; filter: brightness(2); }
        100% { opacity: 1; filter: brightness(1); }
    }
    .anim-item { animation: anim 0.6s ease-out both; }
  `,
  // 38
  'ripple-in': `
    @keyframes anim {
        0%   { opacity: 0; transform: scale(0.5); }
        50%  { opacity: 1; transform: scale(1.1); }
        75%  { opacity: 1; transform: scale(0.95); }
        100% { opacity: 1; transform: scale(1); }
    }
    .anim-item { animation: anim 0.8s ease-in-out both; }
  `,
  // 39
  'split-in': `
    @keyframes anim {
        from { opacity: 0; transform: scaleX(0); transform-origin: center; }
        to   { opacity: 1; transform: scaleX(1); transform-origin: center; }
    }
    .anim-item { animation: anim 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
  `,
  // 40
  'cascade-down': `
    @keyframes anim {
        from { opacity: 0; transform: translateY(-80px) rotate(5deg); }
        to   { opacity: 1; transform: translateY(0) rotate(0); }
    }
    .anim-item { animation: anim 0.8s ease-out both; }
  `,
  // 41
  'tornado-spin': `
    @keyframes anim {
        from { opacity: 0; transform: rotate(720deg) translateX(-200px) scale(0.2); }
        to   { opacity: 1; transform: rotate(0) translateX(0) scale(1); }
    }
    .anim-item { animation: anim 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
  `,
  // 42
  'spring-bounce': `
    @keyframes anim {
        0%   { opacity: 0; transform: translateY(-60px); }
        25%  { opacity: 1; transform: translateY(20px); }
        50%  { opacity: 1; transform: translateY(-10px); }
        75%  { opacity: 1; transform: translateY(5px); }
        100% { opacity: 1; transform: translateY(0); }
    }
    .anim-item { animation: anim 1.2s ease-in-out both; }
  `,
  // 43
  'accordion-open': `
    @keyframes anim {
        0%   { opacity: 0; transform: scaleY(0); }
        60%  { opacity: 1; transform: scaleY(1.05); }
        100% { opacity: 1; transform: scaleY(1); }
    }
    .anim-item { animation: anim 0.8s ease-in-out both; }
  `,
  // 44
  'domino-fall': `
    @keyframes anim {
        0%   { opacity: 0; transform: perspective(600px) rotateX(90deg); transform-origin: bottom; }
        60%  { opacity: 1; transform: perspective(600px) rotateX(-10deg); transform-origin: bottom; }
        100% { opacity: 1; transform: perspective(600px) rotateX(0); transform-origin: bottom; }
    }
    .anim-item { animation: anim 0.8s ease-out both; }
  `,
  // 45
  'meteor-strike': `
    @keyframes anim {
        from { opacity: 0; transform: translate(100px, -100px) rotate(45deg); }
        to   { opacity: 1; transform: translate(0, 0) rotate(0); }
    }
    .anim-item { animation: anim 0.6s ease-out both; }
  `,
  // 46
  'dissolve-in': `
    @keyframes anim {
        from { opacity: 0; filter: blur(5px); transform: scale(1.05); }
        to   { opacity: 1; filter: blur(0); transform: scale(1); }
    }
    .anim-item { animation: anim 0.8s ease-in-out both; }
  `,
  // 47
  'swirl-in': `
    @keyframes anim {
        from { opacity: 0; transform: rotate(360deg) scale(0.2); }
        to   { opacity: 1; transform: rotate(0) scale(1); }
    }
    .anim-item { animation: anim 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
  `,
  // 48
  'radar-sweep': `
    @keyframes anim {
        from { opacity: 0; transform: rotate(-90deg); clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 0); }
        to   { opacity: 1; transform: rotate(0); clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
    }
    .anim-item { animation: anim 0.9s ease-out both; }
  `,
  // 49
  'heartbeat-pop': `
    @keyframes anim {
        0%   { opacity: 0; transform: scale(0); }
        30%  { opacity: 1; transform: scale(1.2); }
        60%  { opacity: 1; transform: scale(0.9); }
        85%  { opacity: 1; transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
    }
    .anim-item { animation: anim 0.8s ease-in-out both; }
  `,
  // 50
  'kaleidoscope': `
    @keyframes anim {
        from { opacity: 0; transform: rotate(90deg) scale(0.5) skewX(20deg); filter: hue-rotate(90deg); }
        to   { opacity: 1; transform: rotate(0) scale(1) skewX(0); filter: hue-rotate(0); }
    }
    .anim-item { animation: anim 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
  `
};

export function getAnimationCSS(animName) {
  const css = ANIMATION_CSS[animName] || ANIMATION_CSS['stagger-left'];
  return css;
}
