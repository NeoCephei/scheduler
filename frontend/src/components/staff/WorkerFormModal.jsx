import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStaffStore } from '../../stores/staffStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SUBSTITUTE_TYPES, SUBSTITUTE_TYPE_LABELS } from '../../lib/constants';
import { ShieldAlert } from 'lucide-react';

export default function WorkerFormModal({ isOpen, onClose, editingWorker, areas, profiles }) {
  const { t } = useTranslation();
  const { addWorker, updateWorker } = useStaffStore();

  const buildInitialForm = (worker) => ({
    name: worker?.name || '',
    category: worker?.category || 'FIJO',
    fixedProfileId: worker?.fixedProfileId || '',
    substituteType: worker?.substituteType || SUBSTITUTE_TYPES[0],
    notes: worker?.notes || '',
    capabilities: worker?.capabilities || []
  });

  const [form, setForm] = useState(buildInitialForm(editingWorker));

  // Sync form when editingWorker changes
  React.useEffect(() => {
    setForm(buildInitialForm(editingWorker));
  }, [editingWorker, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      category: form.category,
      fixedProfileId: form.category === 'FIJO' ? Number(form.fixedProfileId) : null,
      substituteType: form.category === 'SUPLENTE' ? form.substituteType : null,
      notes: form.notes || null,
      capabilities: form.capabilities
    };

    if (editingWorker) {
      await updateWorker(editingWorker.id, payload);
    } else {
      await addWorker(payload);
    }
    onClose();
  };

  const toggleCapability = (profileId) => {
    setForm(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(profileId)
        ? prev.capabilities.filter(id => id !== profileId)
        : [...prev.capabilities, profileId]
    }));
  };

  const toggleArea = (areaId) => {
    const areaProfileIds = profiles.filter(p => p.areaId === areaId).map(p => p.id);
    const allSelected = areaProfileIds.every(id => form.capabilities.includes(id));
    if (allSelected) {
      setForm(prev => ({ ...prev, capabilities: prev.capabilities.filter(id => !areaProfileIds.includes(id)) }));
    } else {
      const newCaps = [...new Set([...form.capabilities, ...areaProfileIds])];
      setForm(prev => ({ ...prev, capabilities: newCaps }));
    }
  };

  const selectClassName = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingWorker ? t('workers.modal_edit_title') : t('workers.modal_new_title')} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name + Category */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('workers.field_name')}</label>
            <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('workers.field_name_placeholder')} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('workers.field_category')}</label>
            <select className={selectClassName} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="FIJO">{t('workers.cat_fijo')}</option>
              <option value="SUPLENTE">{t('workers.cat_suplente')}</option>
            </select>
          </div>
        </div>

        {/* Conditional: Fijo → Perfil. Suplente → Tipo */}
        {form.category === 'FIJO' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('workers.field_fixed_profile')}</label>
            <select className={selectClassName} required value={form.fixedProfileId} onChange={e => setForm({ ...form, fixedProfileId: e.target.value })}>
              <option value="" disabled>{t('workers.field_select_profile')}</option>
              {areas.map(area => (
                <optgroup key={area.id} label={area.name}>
                  {profiles.filter(p => p.areaId === area.id).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('workers.field_sub_type')}</label>
            <select className={selectClassName} value={form.substituteType} onChange={e => setForm({ ...form, substituteType: e.target.value })}>
              {SUBSTITUTE_TYPES.map(st => <option key={st} value={st}>{t(`substitute_type.${st}`)}</option>)}
            </select>
          </div>
        )}

        {/* Capabilities */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            {t('workers.field_capabilities')}
            {form.category === 'SUPLENTE' && form.capabilities.length === 0 && (
              <span className="flex items-center gap-1 text-amber-600 text-xs font-normal">
                <ShieldAlert size={12} /> {t('workers.field_no_caps_warning')}
              </span>
            )}
          </label>
          <div className="border rounded-lg divide-y max-h-52 overflow-y-auto bg-muted/20">
            {areas.map(area => {
              const areaProfiles = profiles.filter(p => p.areaId === area.id);
              if (areaProfiles.length === 0) return null;
              const allSelected = areaProfiles.every(p => form.capabilities.includes(p.id));
              const someSelected = areaProfiles.some(p => form.capabilities.includes(p.id));
              return (
                <div key={area.id}>
                  {/* Area Header — select all */}
                  <label className="flex items-center gap-3 px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={() => toggleArea(area.id)} className="w-4 h-4" />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: area.color }} />
                    <span className="font-semibold text-sm">{area.name}</span>
                  </label>
                  {/* Profile rows */}
                  {areaProfiles.map(profile => (
                    <label key={profile.id} className="flex items-center gap-3 px-3 py-2 pl-10 cursor-pointer hover:bg-muted/30 transition-colors">
                      <input type="checkbox" checked={form.capabilities.includes(profile.id)}
                        onChange={() => toggleCapability(profile.id)} className="w-4 h-4" />
                      <span className="text-sm">{profile.name}</span>
                    </label>
                  ))}
                </div>
              );
            })}
            {areas.length === 0 && <div className="p-4 text-sm text-muted-foreground">{t('workers.field_no_profiles')}</div>}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('workers.field_notes')}</label>
          <textarea
            className="flex w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder={t('workers.field_notes_placeholder')}
          />
        </div>

        <div className="pt-4 flex justify-end gap-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>{t('workers.cancel')}</Button>
          <Button type="submit">{editingWorker ? t('workers.btn_save_changes') : t('workers.btn_create')}</Button>
        </div>
      </form>
    </Modal>
  );
}
