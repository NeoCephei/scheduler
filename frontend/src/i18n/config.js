import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "app.title": "Scheduler",
      "nav.dashboard": "Dashboard",
      "nav.calendar": "Calendar",
      "nav.workers": "Workers",
      "nav.absences": "Absences",
      "nav.configuration": "Configuration",
      "header.buy_coffee": "Buy me a Coffee",
      "dashboard.welcome": "Welcome to Scheduler",
      "dashboard.description": "Your local offline shift planner."
    }
  },
  es: {
    translation: {
      "app.title": "Scheduler",
      "nav.dashboard": "Dashboard",
      "nav.calendar": "Calendario",
      "nav.workers": "Plantilla",
      "nav.absences": "Ausencias",
      "nav.configuration": "Configuración",
      "header.buy_coffee": "Invítame a un Café",
      "dashboard.welcome": "Bienvenido a Scheduler",
      "dashboard.description": "Tu planificador de turnos local y offline."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "es", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
