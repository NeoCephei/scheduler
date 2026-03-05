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
      "nav.trainees": "Students",
      "nav.configuration": "Configuration",
      "header.buy_coffee": "Buy me a Coffee",
      "dashboard.welcome": "Welcome to Scheduler",
      "dashboard.description": "Your local offline shift planner.",
      "support.title": "Support Development",
      "support.subtitle": "Scheduler is a free, open-source tool. If you find it useful, consider buying me a virtual coffee.",
      "support.why_donate": "Why donate?",
      "calendar.today": "Today",
      "calendar.grouping": "Grouping",
      "calendar.by_shift": "By Shift",
      "calendar.by_area": "By Area",
      "calendar.view": "View",
      "calendar.week": "Week",
      "calendar.month": "Month",
      "calendar.export": "Print / Export"
    }
  },
  es: {
    translation: {
      "app.title": "Scheduler",
      "nav.dashboard": "Dashboard",
      "nav.calendar": "Calendario",
      "nav.workers": "Plantilla",
      "nav.absences": "Ausencias",
      "nav.trainees": "Estudiantes",
      "nav.configuration": "Configuración",
      "header.buy_coffee": "Invítame a un Café",
      "dashboard.welcome": "Bienvenido a Scheduler",
      "dashboard.description": "Tu planificador de turnos local y offline.",
      "support.title": "Apoya el Desarrollo",
      "support.subtitle": "Scheduler es una herramienta gratuita y de código abierto. Si te resulta útil en tu día a día, considera invitarme a un café virtual.",
      "support.why_donate": "¿Por qué donar?",
      "calendar.today": "Hoy",
      "calendar.grouping": "Agrupación",
      "calendar.by_shift": "Por Turno",
      "calendar.by_area": "Por Área",
      "calendar.view": "Vista",
      "calendar.week": "Semana",
      "calendar.month": "Mes",
      "calendar.export": "Imprimir / Exportar"
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
