import { createApp } from 'vue'
import App from './App.vue'
import 'primeflex/primeflex.css';
import "primevue/resources/themes/nano/theme.css"; 
import "primevue/resources/primevue.min.css";
import 'primeicons/primeicons.css';

import PrimeVue from 'primevue/config';

const app = createApp(App);
app.use(PrimeVue);

app.mount('#app')
