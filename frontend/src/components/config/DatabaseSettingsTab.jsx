import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Database, FolderOpen } from 'lucide-react';
import { Modal } from '../ui/Modal';

export default function DatabaseSettingsTab() {
  const { t } = useTranslation();
  
  // DB Location state
  const [dbLocation, setDbLocation] = useState('');
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [selectedDbPath, setSelectedDbPath] = useState('');
  const [isApplyingDb, setIsApplyingDb] = useState(false);
  
  // Fetch DB Location on mount
  useEffect(() => {
    fetch('http://localhost:3001/api/system/db-location')
      .then(res => res.json())
      .then(data => {
        if (data.path) setDbLocation(data.path);
      })
      .catch(err => console.error("Error fetching db location", err));
  }, []);
  
  const handleSelectDbLocation = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/system/db-location/select', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.path) {
        setSelectedDbPath(data.path);
        setIsDbModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyDbLocation = async () => {
    setIsApplyingDb(true);
    try {
      await fetch('http://localhost:3001/api/system/db-location/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPath: selectedDbPath })
      });
      // The application will restart automatically if successful.
    } catch (err) {
      console.error(err);
      setIsApplyingDb(false);
      setIsDbModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            {t('config.db_title')}
          </CardTitle>
          <CardDescription>
            {t('config.db_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-muted-foreground">
              {t('config.db_current')}
            </label>
            <div className="flex gap-4 items-center">
              <code className="px-2 py-1 bg-muted rounded text-sm w-full truncate border">
                {dbLocation || '...'}
              </code>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-4">
          <Button variant="outline" onClick={handleSelectDbLocation} className="ml-auto">
            <FolderOpen className="mr-2 h-4 w-4" /> {t('config.db_btn_change')}
          </Button>
        </CardFooter>
      </Card>

      <Modal 
        isOpen={isDbModalOpen} 
        onClose={() => !isApplyingDb && setIsDbModalOpen(false)}
        title={t('config.db_confirm_title')}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('config.db_confirm_body')}
          </p>
          <div className="bg-muted p-3 rounded-md border text-sm break-all font-mono">
            {selectedDbPath}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDbModalOpen(false)} disabled={isApplyingDb}>
              {t('config.cancel')}
            </Button>
            <Button onClick={handleApplyDbLocation} disabled={isApplyingDb}>
              {isApplyingDb ? t('calendar.processing') : t('config.db_confirm_yes')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
