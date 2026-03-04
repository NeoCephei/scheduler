import React, { useState, useEffect } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Save } from 'lucide-react';

export default function GeneralSettingsTab() {
  const { settings, updateSetting } = useConfigStore();
  
  // Local state for the form
  const [noticeDays, setNoticeDays] = useState('0');
  const [isSaving, setIsSaving] = useState(false);
  
  // Sync when settings load
  useEffect(() => {
    if (settings && settings['absence_notice_days'] !== undefined) {
      setNoticeDays(settings['absence_notice_days']);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSetting('absence_notice_days', noticeDays);
      // Optional: Add a subtle toast/success feedback here
    } catch (e) {
      console.error("Failed to save settings", e);
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reglas de Ausencias y Vacaciones</CardTitle>
          <CardDescription>
            Configura los parámetros globales requeridos para la petición de días libres. Estos valores servirán para advertir a los usuarios durante la creación de ausencias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <label htmlFor="notice-days" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Antelación mínima requerida (en días)
            </label>
            <div className="flex gap-4 items-center">
              <Input
                id="notice-days"
                type="number"
                min="0"
                value={noticeDays}
                onChange={(e) => setNoticeDays(e.target.value)}
                placeholder="Ej. 15"
                className="max-w-[150px]"
              />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                días previos al inicio de la ausencia.
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-4">
          <Button onClick={handleSave} disabled={isSaving} className="ml-auto">
            {isSaving ? 'Guardando...' : (
              <>
               <Save className="mr-2 h-4 w-4" /> Guardar Cambios
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* 
        In the future (Phase 7+), additional setting blocks can be appended here.
        E.g. "General Interface Settings" or "Algorithm Tweaks".
      */}
    </div>
  );
}
