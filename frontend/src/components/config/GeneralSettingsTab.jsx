import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfigStore } from '../../stores/configStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Save } from 'lucide-react';

export default function GeneralSettingsTab() {
  const { t } = useTranslation();
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
          <CardTitle>{t('config.rules_title')}</CardTitle>
          <CardDescription>
            {t('config.rules_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <label htmlFor="notice-days" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t('config.rules_notice_label')}
            </label>
            <div className="flex gap-4 items-center">
              <Input
                id="notice-days"
                type="number"
                min="0"
                value={noticeDays}
                onChange={(e) => setNoticeDays(e.target.value)}
                placeholder={t('config.rules_notice_placeholder')}
                className="max-w-[150px]"
              />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {t('config.rules_notice_suffix')}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-4">
          <Button onClick={handleSave} disabled={isSaving} className="ml-auto">
            {isSaving ? t('config.saving') : (
              <>
               <Save className="mr-2 h-4 w-4" /> {t('config.save_changes')}
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
