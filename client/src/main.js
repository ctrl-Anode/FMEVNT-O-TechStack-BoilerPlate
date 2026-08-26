import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/styles/main.css';
import { animateDirective } from './directives/animate';
import { permissionDirective } from './directives/permission';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.directive('animate', animateDirective);
app.directive('permission', permissionDirective);

app.mount('#app');
