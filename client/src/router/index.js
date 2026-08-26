import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('@/views/dashboard/DashboardView.vue') },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/users/UsersListView.vue'),
        meta: { permission: 'users:read', title: 'Users' }
      },
      {
        path: 'roles',
        name: 'roles',
        component: () => import('@/views/roles/RolesListView.vue'),
        meta: { permission: 'roles:read', title: 'Roles & Permissions' }
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/settings/ProfileView.vue'),
        meta: { title: 'Profile & Security' }
      }
    ]
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { guest: true }
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { guest: true }
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: { guest: true }
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/errors/ForbiddenView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/errors/NotFoundView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 })
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.init();

  if (to.matched.some((record) => record.meta.requiresAuth) && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'dashboard' };
  }

  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { name: 'forbidden' };
  }

  return true;
});

router.afterEach((to) => {
  const suffix = to.meta.title ? ` - ${to.meta.title}` : '';
  document.title = `Acme Platform${suffix}`;
});

export default router;
