import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';
import { X, FileSpreadsheet, Download, Settings2, Info, Eye } from 'lucide-react';

export default function ExportModal({ isOpen, onClose, onExport }) {
  const { t } = useTranslation();
  const [showUncovered, setShowUncovered] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    await onExport({ showUncovered });
    setLoading(false);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-background rounded-xl shadow-2xl z-50 flex flex-col border animate-in zoom-in-95 duration-200">
          
          <div className="flex justify-between items-center p-5 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Settings2 size={20}/>
              </div>
              <div>
                <Dialog.Title className="text-lg font-bold leading-tight">{t('calendar.export_options')}</Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground">{t('calendar.export_subtitle')}</Dialog.Description>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X size={20}/></Button>
          </div>

          <div className="p-6 flex flex-col md:flex-row gap-6 overflow-y-auto max-h-[70vh]">
            {/* Options */}
            <div className="flex-1 space-y-4">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">{t('common.configuration')}</h4>
              
              <label className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-sm">{t('calendar.show_uncovered')}</span>
                  <span className="text-[10px] text-muted-foreground max-w-[180px] leading-tight mt-1">
                    {showUncovered 
                      ? t('calendar.show_uncovered_desc_on') 
                      : t('calendar.show_uncovered_desc_off')}
                  </span>
                </div>
                <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${showUncovered ? 'bg-primary' : 'bg-input'}`}>
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={showUncovered}
                    onChange={(e) => setShowUncovered(e.target.checked)}
                  />
                  <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow ring-0 transition-transform ${showUncovered ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </label>

              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-primary">
                   <Info size={16} />
                   <span className="text-xs font-bold uppercase tracking-tight">{t('calendar.export_info_title')}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {t('calendar.export_config_compact')}
                </p>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="flex-1 space-y-4">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
                <Eye size={14} /> {t('calendar.preview')}
              </h4>
              
              <div className="border rounded-xl overflow-hidden bg-card text-[10px] shadow-sm">
                <div className="grid grid-cols-2 bg-muted/50 border-b font-bold text-center">
                  <div className="p-2 border-r">{t('calendar.preview_profile')}</div>
                  <div className="p-2">{t('calendar.preview_monday')}</div>
                </div>
                
                {/* Sample Covered Row */}
                <div className="grid grid-cols-2 border-b">
                  <div className="p-2 border-r font-semibold flex items-center">Box 1</div>
                  <div className="p-2 flex flex-col items-center justify-center text-center leading-tight">
                    <span className="text-[8px] text-muted-foreground">08:00 - 15:00</span>
                    <span className="font-bold uppercase">JULIA MARÍN</span>
                  </div>
                </div>

                {/* Sample Uncovered Row */}
                <div className="grid grid-cols-2">
                  <div className="p-2 border-r font-semibold flex items-center">Recepción</div>
                  <div className={`p-2 flex flex-col items-center justify-center text-center leading-tight transition-colors ${showUncovered ? 'bg-red-50' : 'bg-transparent'}`}>
                    {showUncovered ? (
                      <>
                        <span className="text-[8px] text-muted-foreground">15:00 - 22:00</span>
                        <span className="font-bold text-red-600 uppercase">{t('calendar.uncovered')}</span>
                      </>
                    ) : (
                      <span className="italic text-muted-foreground/10 text-[8px] tracking-widest uppercase">{t('calendar.preview_empty')}</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-center text-muted-foreground italic">
                {t('calendar.preview_approx')}
              </p>
            </div>
          </div>

          <div className="p-5 bg-muted/30 border-t flex gap-3 justify-end rounded-b-xl">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleDownload} disabled={loading} className="gap-2 px-6">
              {loading ? (
                <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {t('calendar.download_excel')}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
