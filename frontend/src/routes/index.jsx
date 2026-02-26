import { createRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Index,
})

function Index() {
  const { t } = useTranslation()

  return (
    <div className="p-8">
      <h3 className="text-2xl font-bold tracking-tight">{t('dashboard.welcome')}</h3>
      <p className="text-muted-foreground mt-2">{t('dashboard.description')}</p>
    </div>
  )
}
