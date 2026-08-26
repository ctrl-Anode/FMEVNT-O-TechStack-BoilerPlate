import { useAuthStore } from '@/stores/auth';

export const permissionDirective = {
  mounted(el, binding) {
    evaluate(el, binding);
  },
  updated(el, binding) {
    evaluate(el, binding);
  }
};

function evaluate(el, binding) {
  const auth = useAuthStore();
  const required = binding.value;

  let allowed = true;
  if (typeof required === 'string') {
    allowed = auth.can(required);
  } else if (Array.isArray(required)) {
    allowed = required.some((permission) => auth.can(permission));
  }

  if (!allowed) {
    el.style.display = 'none';
    el.dataset.permissionHidden = 'true';
  } else if (el.dataset.permissionHidden) {
    el.style.display = '';
    delete el.dataset.permissionHidden;
  }
}

export default permissionDirective;
