import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { useTranslation } from 'react-i18next';
import { Coffee, Heart, Star, Zap } from 'lucide-react';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/support',
  component: SupportPage,
});

function SupportPage() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 w-full bg-muted/10">
      <div className="max-w-4xl mx-auto p-4 md:p-8 pt-12">
        <div className="text-center mb-12 animate-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center justify-center p-4 bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-full mb-6 shadow-sm border border-orange-200 dark:border-orange-800">
            <Coffee size={40} className="animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            {t('support.title', 'Apoya el Desarrollo')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('support.subtitle', 'Scheduler es una herramienta gratuita y de código abierto. Si te resulta útil en tu día a día, considera invitarme a un café virtual.')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-card border rounded-2xl p-8 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Heart className="text-rose-500" />
                {t('support.why_donate', '¿Por qué donar?')}
              </h2>
              <ul className="space-y-4 text-muted-foreground mb-8">
                <li className="flex items-start gap-3">
                  <Star className="text-primary mt-1 shrink-0" size={18} />
                  <span>Mantiene la aplicación <strong>100% gratuita</strong> y libre de anuncios.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Zap className="text-amber-500 mt-1 shrink-0" size={18} />
                  <span>Motiva el desarrollo de <strong>nuevas funcionalidades</strong> y actualizaciones constantes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Coffee className="text-orange-500 mt-1 shrink-0" size={18} />
                  <span>¡Me paga el café que necesito para programar de madrugada!</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-950/20 dark:to-rose-950/20 border border-orange-100 dark:border-orange-900/50 rounded-2xl p-8 shadow-sm text-center flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-rose-400"></div>
            <h3 className="text-2xl font-bold mb-2">Buy Me a Coffee</h3>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Es una forma rápida, segura y directa de apoyar económicamente a creadores de contenido y desarrolladores de software libre.
            </p>
            
            <a 
              href="https://buymeacoffee.com/mcampot93" 
              target="_blank" 
              rel="noreferrer"
              className="group inline-flex items-center justify-center gap-3 bg-[#FFDD00] hover:bg-[#FFC000] text-black font-bold text-lg px-8 py-4 rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="Buy me a coffee" className="h-6 w-6" />
              Invítame a un café
            </a>
            <p className="mt-4 text-sm font-medium text-muted-foreground/80">buymeacoffee.com/mcampot93</p>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Hecho con ❤️ para facilitar la gestión de turnos.</p>
          <p className="mt-1">¡Gracias por usar Scheduler!</p>
        </div>
      </div>
    </div>
  );
}
