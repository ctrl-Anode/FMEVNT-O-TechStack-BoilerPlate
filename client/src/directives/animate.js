import { animate } from 'motion';

const variants = {
  up: { transform: ['translateY(16px)', 'translateY(0)'] },
  down: { transform: ['translateY(-16px)', 'translateY(0)'] },
  left: { transform: ['translateX(16px)', 'translateX(0)'] },
  fade: {}
};

export function animateDirective(el, binding) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const options = typeof binding.value === 'string' ? { from: binding.value } : binding.value || {};
  const direction = variants[options.from || 'up'];
  const delay = options.delay || 0;
  const duration = options.duration || 0.45;

  el.style.opacity = '0';
  el.style.willChange = 'opacity, transform';

  requestAnimationFrame(() => {
    animate(
      el,
      {
        opacity: [0, 1],
        ...(direction.transform ? { transform: direction.transform } : {})
      },
      { duration, delay, easing: [0.22, 1, 0.36, 1] }
    ).finished.then(() => {
      el.style.willChange = '';
    });
  });
}

export default animateDirective;
