import { createApp } from 'vue'
import App from './App.vue'
import 'primeflex/primeflex.css';
import "primevue/resources/themes/nano/theme.css"; 
import "primevue/resources/primevue.min.css";
import 'primeicons/primeicons.css';

import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';

import PrimeVue from 'primevue/config';

const app = createApp(App);
app.use(PrimeVue);
app.use(ToastService);
app.use(ConfirmationService);

app.mount('#app')
