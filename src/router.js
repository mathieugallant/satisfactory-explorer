import { createRouter, createWebHistory } from 'vue-router';

// Dummy route. Router is only used for url manipulation.
const routes = [
  {
    path: '/',
    name: '_',
    component: {},
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;