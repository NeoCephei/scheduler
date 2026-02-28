import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Coffee } from 'lucide-react'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-8 flex items-center space-x-2">
            <span className="font-bold sm:inline-block">
              {t('app.title')}
            </span>
          </div>
          
          <nav className="flex items-center space-x-6 text-sm font-medium flex-1">
            <Link to="/" activeProps={{ className: "text-foreground font-semibold" }} inactiveProps={{ className: "text-foreground/60 font-medium" }} className="transition-colors hover:text-foreground/80">
              {t('nav.dashboard')}
            </Link>
            <Link to="/staff" activeProps={{ className: "text-foreground font-semibold" }} inactiveProps={{ className: "text-foreground/60 font-medium" }} className="transition-colors hover:text-foreground/80">
              Plantilla
            </Link>
            <Link to="/absences" activeProps={{ className: "text-foreground font-semibold" }} inactiveProps={{ className: "text-foreground/60 font-medium" }} className="transition-colors hover:text-foreground/80">
              Ausencias
            </Link>
            <Link to="/configuration" activeProps={{ className: "text-foreground font-semibold" }} inactiveProps={{ className: "text-foreground/60 font-medium" }} className="transition-colors hover:text-foreground/80">
              {t('nav.configuration')}
            </Link>
          </nav>

          <div className="flex items-center justify-end space-x-4">
            <button 
              onClick={toggleLanguage}
              className="text-sm font-medium uppercase hover:underline"
            >
              {i18n.language}
            </button>
            
            <a 
              href="https://buymeacoffee.com" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center space-x-2 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
              title={t('header.buy_coffee')}
            >
              <Coffee size={20} />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 flex w-full">
        <Outlet />
      </main>
    </div>
  )
}
