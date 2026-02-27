import { useEffect, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Route as rootRoute } from './__root';
import { useConfigStore } from '../stores/configStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// Subcomponents for tabs
import AreasProfilesTab from '../components/config/AreasProfilesTab';
import ShiftsTab from '../components/config/ShiftsTab';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/configuration',
  component: Configuration,
});

function Configuration() {
  const { t } = useTranslation();
  const { fetchData, loading, error } = useConfigStore();
  const [activeTab, setActiveTab] = useState('areas-profiles');

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading configuration...</div>;
  if (error) return <div className="p-8 text-destructive">Error: {error}</div>;

  const tabs = [
    { id: 'areas-profiles', label: 'Áreas y Perfiles' },
    { id: 'shifts', label: 'Turnos (Plantillas Base)' },
  ];

  return (
    <div className="p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div>
        <h3 className="text-3xl font-bold tracking-tight">{t('nav.configuration')}</h3>
        <p className="text-muted-foreground mt-2">Gestiona la estructura base de la plantilla y horarios.</p>
      </div>

      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-max">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="mt-2 border-0 shadow-none bg-transparent sm:bg-card sm:border sm:shadow">
        <CardContent className="p-0 sm:p-6">
          {activeTab === 'areas-profiles' && <AreasProfilesTab />}
          {activeTab === 'shifts' && <ShiftsTab />}
        </CardContent>
      </Card>
    </div>
  );
}
