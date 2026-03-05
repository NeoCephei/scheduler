import React, { useState, useEffect } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { useStaffStore } from '../stores/staffStore';
import { useConfigStore } from '../stores/configStore';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import WorkerFormModal from '../components/staff/WorkerFormModal';
import { Plus, Edit2, Trash2, Power, PowerOff, AlertTriangle, ChevronRight } from 'lucide-react';
import { SUBSTITUTE_TYPE_LABELS } from '../lib/constants';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff',
  component: StaffPage,
});

function StaffPage() {
  const { t } = useTranslation();
  const { workers, loading, fetchWorkers, toggleWorkerActive, deleteWorker } = useStaffStore();
  const { areas, profiles, fetchData } = useConfigStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [workerToDelete, setWorkerToDelete] = useState(null);

  useEffect(() => {
    fetchWorkers();
    fetchData();
  }, []);

  const filtered = workers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || w.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const fijos = filtered.filter(w => w.category === 'FIJO');
  const suplentes = filtered.filter(w => w.category === 'SUPLENTE');

  const getProfileName = (profileId) => profiles.find(p => p.id === profileId)?.name || '—';
  const getAreaColor = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return '#888';
    return areas.find(a => a.id === profile.areaId)?.color || '#888';
  };

  const openNew = () => { setEditingWorker(null); setFormOpen(true); };
  const openEdit = (w) => { setEditingWorker(w); setFormOpen(true); };

  const WorkerRow = ({ worker }) => {
    const hasNoCaps = worker.category === 'SUPLENTE' && (!worker.capabilities || worker.capabilities.length === 0);
    const capsCount = worker.capabilities?.length || 0;
    return (
      <div className={`flex items-center gap-3 p-4 border rounded-lg bg-card shadow-sm transition-opacity ${!worker.isActive ? 'opacity-50' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/staff/$workerId" params={{ workerId: String(worker.id) }}
              className="font-semibold hover:text-primary hover:underline transition-colors">
              {worker.name}
            </Link>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${worker.category === 'FIJO' ? 'bg-primary/10 text-primary' : 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30'}`}>
              {t(`workers.cat_${worker.category.toLowerCase()}`)}
            </span>
            {!worker.isActive && (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t('workers.badge_inactive')}</span>
            )}
            {hasNoCaps && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                <AlertTriangle size={11} /> {t('workers.badge_no_caps')}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
            {worker.category === 'FIJO' && worker.fixedProfileId && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: getAreaColor(worker.fixedProfileId) }} />
                {getProfileName(worker.fixedProfileId)}
              </span>
            )}
            {worker.category === 'SUPLENTE' && worker.substituteType && (
              <span className="capitalize">{t(`substitute_type.${worker.substituteType}`)}</span>
            )}
            {capsCount > 0 && (
              <span>{t(capsCount === 1 ? 'workers.caps_count_one' : 'workers.caps_count_other', { count: capsCount })}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 border-l pl-3 shrink-0">
          <Button variant="ghost" size="icon" title={worker.isActive ? t('workers.btn_deactivate') : t('workers.btn_activate')} onClick={() => toggleWorkerActive(worker.id)}>
            {worker.isActive ? <PowerOff size={16} className="text-muted-foreground" /> : <Power size={16} className="text-primary" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(worker)}><Edit2 size={16} /></Button>
          <Link to="/staff/$workerId" params={{ workerId: String(worker.id) }}>
            <Button variant="ghost" size="icon" title={t('workers.btn_view')}><ChevronRight size={16} /></Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setWorkerToDelete(worker)}>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-muted-foreground">{t('workers.loading')}</div>;

  return (
    <div className="flex-1 w-full p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{t('workers.title')}</h1>
          <p className="text-sm text-muted-foreground">{t(workers.length === 1 ? 'workers.count_one' : 'workers.count_other', { count: workers.length })}</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus size={16} /> {t('workers.new')}</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input placeholder={t('workers.search')} className="max-w-xs" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-1">
          {['ALL', 'FIJO', 'SUPLENTE'].map(cat => (
            <Button key={cat} variant={categoryFilter === cat ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter(cat)}>
              {cat === 'ALL' ? t('workers.filter_all') : t(`workers.cat_${cat.toLowerCase()}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Fijos Section */}
      {(categoryFilter === 'ALL' || categoryFilter === 'FIJO') && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('workers.fixed_section', { count: fijos.length })}</h2>
          {fijos.length === 0
            ? <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg text-sm">{t('workers.empty_fixed')}</div>
            : fijos.map(w => <WorkerRow key={w.id} worker={w} />)
          }
        </div>
      )}

      {/* Suplentes Section */}
      {(categoryFilter === 'ALL' || categoryFilter === 'SUPLENTE') && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('workers.subs_section', { count: suplentes.length })}</h2>
          {suplentes.length === 0
            ? <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg text-sm">{t('workers.empty_subs')}</div>
            : suplentes.map(w => <WorkerRow key={w.id} worker={w} />)
          }
        </div>
      )}

      {/* Worker Form Modal */}
      <WorkerFormModal
        isOpen={isFormOpen}
        onClose={() => setFormOpen(false)}
        editingWorker={editingWorker}
        areas={areas}
        profiles={profiles}
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!workerToDelete} onClose={() => setWorkerToDelete(null)} title={t('workers.delete_title')}>
        <div className="space-y-4">
          <p className="text-sm">{t('workers.delete_body', { name: workerToDelete?.name })}</p>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setWorkerToDelete(null)}>{t('workers.cancel')}</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0" onClick={async () => {
              await deleteWorker(workerToDelete.id);
              setWorkerToDelete(null);
            }}>{t('workers.delete_confirm')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
