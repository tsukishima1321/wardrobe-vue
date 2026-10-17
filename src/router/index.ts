import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/detail/:src',
      name: 'detail',
      component: () => import('../views/DetailView.vue')
    },
    {
      path: '/search/:searchword?',
      name: 'search',
      component: () => import('../views/SearchView.vue')
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('../views/UploadView.vue')
    },
    {
      path: '/manage',
      name: 'manage',
      component: () => import('../views/ManageView.vue')
    },
    {
      path: '/diary',
      name: 'diary',
      component: () => import('../views/DiaryView.vue')
    },
    {
      path: '/diary/archive/:year/:month',
      name: 'blog-archive',
      component: () => import('../components/blog/BlogFeed.vue')
    },
    {
      path: '/diary/new',
      name: 'blog-editor',
      component: () => import('../components/blog/BlogEditor.vue')
    },
    {
      path: '/diary/:id/edit',
      name: 'blog-editor-edit',
      component: () => import('../components/blog/BlogEditor.vue')
    },
    {
      path: '/diary/:id',
      name: 'blog-post',
      component: () => import('../components/blog/BlogReader.vue')
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: () => import('../views/GalleryView.vue')
    },
  ],
})

export default router
