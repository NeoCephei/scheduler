import React, { useState, useEffect } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { useStaffStore } from '../stores/staffStore';
import { useConfigStore } from '../stores/configStore';
import { AbsencesAPI } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ABSENCE_TYPES, ABSENCE_TYPE_LABELS } from '../lib/constants';
import { Calendar, User, Search, RefreshCw, Plus, AlertTriangle, ArrowRight, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarAPI } from '../lib/api';
import { useNavigate } from '@tanstack/react-router';
import AssignmentModal from '../components/calendar/AssignmentModal';

function AbsencesDashboard({ dashboardDate, setDashboardDate, workersMap, absences, t }) {
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const currentYear = dashboardDate.getFullYear();
  const currentMonth = dashboardDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(currentYear, currentMonth, day);
    const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Map JS getDay (0-6) mapping to i18n keys
    let dayKey = 'days_short.sun';
    if (dayOfWeek === 1) dayKey = 'days_short.mon';
    else if (dayOfWeek === 2) dayKey = 'days_short.tue';
    else if (dayOfWeek === 3) dayKey = 'days_short.wed';
    else if (dayOfWeek === 4) dayKey = 'days_short.thu';
    else if (dayOfWeek === 5) dayKey = 'days_short.fri';
    else if (dayOfWeek === 6) dayKey = 'days_short.sat';
    
    const dayName = t(dayKey);
    return { day, dateStr, dayName, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 };
  });

  const dailyAbsenceCounts = new Array(daysInMonth).fill(0);
  const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const monthEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const workersWithMonthAbsences = Object.values(workersMap).filter(worker => {
    return absences.some(a => a.workerId === worker.id && a.dateStart <= monthEndStr && a.dateEnd >= monthStartStr);
  }).sort((a,b) => a.name.localeCompare(b.name));

  const dashboardData = workersWithMonthAbsences.map(worker => {
    const workerRow = { worker, days: new Array(daysInMonth).fill(null) };
    const workerAbsences = absences.filter(a => a.workerId === worker.id && a.dateStart <= monthEndStr && a.dateEnd >= monthStartStr);
    
    monthDays.forEach((md, idx) => {
      const activeAbsence = workerAbsences.find(a => a.dateStart <= md.dateStr && a.dateEnd >= md.dateStr);
      if (activeAbsence) {
        workerRow.days[idx] = activeAbsence;
        dailyAbsenceCounts[idx]++;
      }
    });
    
    return workerRow;
  });

  const handlePrevMonth = () => {
    setDashboardDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setDashboardDate(new Date(currentYear, currentMonth + 1, 1));
  };
  
  const monthNames = [
    t('months.jan', { defaultValue: 'Enero' }), t('months.feb', { defaultValue: 'Febrero' }), t('months.mar', { defaultValue: 'Marzo' }),
    t('months.apr', { defaultValue: 'Abril' }), t('months.may', { defaultValue: 'Mayo' }), t('months.jun', { defaultValue: 'Junio' }),
    t('months.jul', { defaultValue: 'Julio' }), t('months.aug', { defaultValue: 'Agosto' }), t('months.sep', { defaultValue: 'Septiembre' }),
    t('months.oct', { defaultValue: 'Octubre' }), t('months.nov', { defaultValue: 'Noviembre' }), t('months.dec', { defaultValue: 'Diciembre' })
  ];

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between bg-muted/20 p-4 rounded-xl border">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft size={16} />
          </Button>
          <h2 className="text-lg font-semibold w-40 text-center">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground flex gap-4">
          <span className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> {t('absences.legend_absent', { defaultValue: 'Ausente' })}</span>
        </div>
      </div>

      <div className="border rounded-xl overflow-x-auto bg-card shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="p-3 font-semibold sticky left-0 bg-muted/90 backdrop-blur z-10 border-r border-b min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                {t('absences.worker', { defaultValue: 'Trabajador' })}
              </th>
              {monthDays.map((md, idx) => (
                <th key={md.day} className={`p-1 border-r last:border-r-0 min-w-[44px] text-center ${md.isWeekend ? 'bg-muted/30' : ''}`}>
                  <div className={`font-semibold text-xs mb-0.5 ${md.isWeekend ? 'text-muted-foreground' : 'text-foreground/70'}`}>
                    {md.dayName}
                  </div>
                  <div className={`font-bold ${md.isWeekend ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {md.day}
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 font-medium mt-0.5" title={t('absences.total_day_absences', { defaultValue: 'Total ausencias' })}>
                    ({dailyAbsenceCounts[idx]})
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dashboardData.length === 0 ? (
              <tr>
                <td colSpan={daysInMonth + 1} className="p-8 text-center text-muted-foreground">
                  {t('absences.no_absences_month', { defaultValue: 'No hay ausencias programadas para este mes.' })}
                </td>
              </tr>
            ) : (
              dashboardData.map((row) => (
                <tr key={row.worker.id} className="border-b last:border-b-0 hover:bg-muted/10 transition-colors">
                  <td className="p-3 sticky left-0 bg-card/90 backdrop-blur z-10 font-medium border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="truncate w-48 text-[13px]" title={row.worker.name}>
                      {row.worker.name}
                    </div>
                  </td>
                  {row.days.map((absence, dayIdx) => {
                    const md = monthDays[dayIdx];
                    return (
                    <td key={dayIdx} className={`border-r last:border-r-0 p-1 text-center relative h-10 ${md.isWeekend ? 'bg-muted/10' : ''}`}>
                      {absence ? (
                        <div 
                          className="absolute inset-1 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50 rounded flex items-center justify-center cursor-help transition-all hover:bg-red-100 dark:hover:bg-red-900/40"
                          title={`${t('absence_type.' + absence.type, { defaultValue: ABSENCE_TYPE_LABELS[absence.type] || absence.type })} ${absence.note ? '- ' + absence.note : ''}`}
                        >
                          <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm"></div>
                        </div>
                      ) : (
                        <div className="absolute inset-1 hover:bg-muted/30 rounded transition-colors"></div>
                      )}
                    </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/absences',
  component: GlobalAbsencesPage,
});

function GlobalAbsencesPage() {
  const { t } = useTranslation();
  const { absences, workersMap, absencesLoading, fetchGlobalAbsences, refreshGlobalAbsences, updateAbsence, deleteAbsence } = useStaffStore();
  const { settings, fetchData: fetchConfigData } = useConfigStore();
  
  useEffect(() => { 
    fetchGlobalAbsences();
    fetchConfigData();
  }, [fetchGlobalAbsences, fetchConfigData]);

  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('LIST');
  const [dashboardDate, setDashboardDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Absence Modal
  const [isAbsenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [editingAbsenceId, setEditingAbsenceId] = useState(null);
  const [absenceForm, setAbsenceForm] = useState({ workerId: '', type: ABSENCE_TYPES[0], dateStart: '', dateEnd: '', note: '' });
  const [absenceError, setAbsenceError] = useState('');
  const [impactData, setImpactData] = useState(null);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);
  const navigate = useNavigate();

  // Management Modal from cards
  const [impactModalAbsence, setImpactModalAbsence] = useState(null);
  const [impactModalData, setImpactModalData] = useState(null);
  const [isImpactLoading, setIsImpactLoading] = useState(false);
  const [selectedCellForAssignment, setSelectedCellForAssignment] = useState(null);

  // Coverage Calculation for active and future absences
  const [coverageData, setCoverageData] = useState({});
  const [isCoverageLoading, setIsCoverageLoading] = useState(false);

  useEffect(() => {
    const computeCoverage = async () => {
      // 1. Identify valid absences that need coverage calculation
      const nowStr = new Date().toISOString().split('T')[0];
      const validAbsences = absences.filter(a => a.dateEnd >= nowStr);
      if (validAbsences.length === 0 || workersMap.length === 0) {
        setCoverageData({});
        return;
      }

      // 2. Find min dateStart and max dateEnd to fetch a single matrix
      let minDate = validAbsences[0].dateStart;
      let maxDate = validAbsences[0].dateEnd;
      validAbsences.forEach(a => {
        if (a.dateStart < minDate) minDate = a.dateStart;
        if (a.dateEnd > maxDate) maxDate = a.dateEnd;
      });

      // Avoid fetching the past before today for coverage purposes
      if (minDate < nowStr) minDate = nowStr;

      try {
        setIsCoverageLoading(true);
        const matrix = await CalendarAPI.getMatrix(minDate, maxDate);
        
        const newCoverageData = {};
        
        for (const abs of validAbsences) {
          const worker = workersMap[abs.workerId];
          if (!worker || worker.category !== 'FIJO' || !worker.fixedProfileId) {
            // Not a fixed worker with a profile, so no strict "uncovered" shifts
            newCoverageData[abs.id] = { required: false };
            continue;
          }

          const checkStart = abs.dateStart < nowStr ? nowStr : abs.dateStart;
          const checkEnd = abs.dateEnd;
          
          const relevantCells = matrix.filter(c => 
            c.profileId === worker.fixedProfileId &&
            c.date >= checkStart && c.date <= checkEnd
          );
          
          const uncoveredCells = relevantCells.filter(c => c.status === 'UNCOVERED');
          
          newCoverageData[abs.id] = {
            required: true,
            isFullyCovered: uncoveredCells.length === 0,
            uncoveredCount: uncoveredCells.length
          };
        }
        
        setCoverageData(newCoverageData);
      } catch (err) {
        console.error("Failed to fetch matrix for coverage", err);
      } finally {
        setIsCoverageLoading(false);
      }
    };

    if (absences.length > 0 && Object.keys(workersMap).length > 0) {
      computeCoverage();
    }
  }, [absences, workersMap]);

  const loadImpactData = async (absence) => {
    setIsImpactLoading(true);
    const worker = workersMap[absence.workerId];
    if (worker) {
      try {
        const matrix = await CalendarAPI.getMatrix(absence.dateStart, absence.dateEnd);
        if (worker.category === 'FIJO' && worker.fixedProfileId) {
          const profileId = worker.fixedProfileId;
          const affected = matrix.filter(cell => cell.profileId === profileId);
          setImpactModalData(affected.sort((a,b) => a.date.localeCompare(b.date)));
        } else {
          setImpactModalData([]); // Supplements
        }
      } catch(e) { console.error(e); setImpactModalData([]); }
    }
    setIsImpactLoading(false);
  };

  const handleCheckImpact = async (e) => {
    e.preventDefault();
    setAbsenceError('');
    try {
      if (!absenceForm.workerId) {
        setAbsenceError(t('absences.error_select_worker'));
        return;
      }
      setIsCheckingImpact(true);
      const matrix = await CalendarAPI.getMatrix(absenceForm.dateStart, absenceForm.dateEnd);
      const affected = matrix.filter(cell => cell.allocatedWorkerId === Number(absenceForm.workerId));
      setIsCheckingImpact(false);

      if (affected.length > 0) {
        setImpactData(affected);
        // Do not save yet, wait for user confirmation
      } else {
        await executeSave();
      }
    } catch (err) {
      setIsCheckingImpact(false);
      setAbsenceError(err.response?.data?.error || err.message || t('absences.error_check'));
    }
  };

  const executeSave = async () => {
    try {
      const data = { 
        ...absenceForm, 
        workerId: Number(absenceForm.workerId)
      };
      
      if (editingAbsenceId) {
        await updateAbsence(editingAbsenceId, data);
      } else {
        await AbsencesAPI.create(data);
      }
      
      setAbsenceModalOpen(false);
      setEditingAbsenceId(null);
      setAbsenceForm({ workerId: '', type: ABSENCE_TYPES[0], dateStart: '', dateEnd: '', note: '' });
      setImpactData(null);
      refreshGlobalAbsences();
    } catch (err) {
      setAbsenceError(err.response?.data?.error || t('absences.error_save'));
    }
  };

  const openCreateModal = () => {
    setEditingAbsenceId(null);
    setAbsenceForm({ workerId: '', type: ABSENCE_TYPES[0], dateStart: '', dateEnd: '', note: '' });
    setAbsenceModalOpen(true);
  };
  
  const handleEdit = (absence) => {
    setEditingAbsenceId(absence.id);
    setAbsenceForm({
      workerId: String(absence.workerId),
      type: absence.type,
      dateStart: absence.dateStart,
      dateEnd: absence.dateEnd,
      note: absence.note || ''
    });
    setAbsenceModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm(t('absences.confirm_delete'))) {
      try {
        await deleteAbsence(id);
        refreshGlobalAbsences();
      } catch (err) {
        alert(err.response?.data?.error || t('absences.error_delete'));
      }
    }
  };

  // Get local 'YYYY-MM-DD' taking timezone into account
  const nowObj = new Date();
  const now = new Date(nowObj.getTime() - (nowObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  // Notice period warning
  let noticeWarningMsg = null;
  if (absenceForm.dateStart && (absenceForm.type === 'VACACIONES' || absenceForm.type === 'ASUNTOS_PROPIOS')) {
    const noticeDaysSetting = settings?.['absence_notice_days'];
    const minNoticeDays = noticeDaysSetting ? parseInt(noticeDaysSetting, 10) : 0;
    
    if (minNoticeDays > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(absenceForm.dateStart);
      start.setHours(0, 0, 0, 0);
      
      const diffTime = start - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < minNoticeDays) {
        noticeWarningMsg = t('absences.notice_warning', { days: diffDays, min: minNoticeDays });
      }
    }
  }

  const filteredAbsences = absences
    .filter(a => {
      // 1. Filter by unexisting worker (could happen if worker was hard deleted, though we use soft delete)
      const w = workersMap[a.workerId];
      if (!w) return false;
      
      // 2. Filter by search name
      if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false;
      
      // 3. Filter by Time Time
      if (timeFilter === 'ACTIVE') return a.dateStart <= now && a.dateEnd >= now;
      if (timeFilter === 'FUTURE') return a.dateStart > now;
      if (timeFilter === 'PAST') return a.dateEnd < now;
      return true;
    })
    // Sort logic: active first, then future, then past.
    .sort((a, b) => {
      // Descending by start date
      return new Date(b.dateStart) - new Date(a.dateStart);
    });

  const getSubLabel = (a) => {
    if (a.dateStart > now) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(a.dateStart);
      target.setHours(0, 0, 0, 0);
      const diffTime = target - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { text: diffDays === 1 ? t('absences.tomorrow') : t('absences.in_days', { count: diffDays }), color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' };
    }
    if (a.dateStart <= now && a.dateEnd >= now) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(a.dateEnd);
      target.setHours(0, 0, 0, 0);
      const diffTime = target - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let text = t('absences.days_left', { count: diffDays });
      if (diffDays === 0) text = t('absences.ends_today');
      if (diffDays === 1) text = t('absences.ends_tomorrow');
      return { text, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' };
    }
    return null;
  };

  // Group absences
  const groupedAbsences = { ACTIVE: [], FUTURE: [], PAST: [] };
  filteredAbsences.forEach(a => {
    if (a.dateEnd < now) groupedAbsences.PAST.push(a);
    else if (a.dateStart > now) groupedAbsences.FUTURE.push(a);
    else groupedAbsences.ACTIVE.push(a);
  });

  const timeGroupLabels = {
    ACTIVE: { title: t('absences.group_active'), color: 'text-red-600 dark:text-red-400', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    FUTURE: { title: t('absences.group_future'), color: 'text-blue-600 dark:text-blue-400', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    PAST: { title: t('absences.group_past'), color: 'text-muted-foreground', badgeClass: 'bg-muted text-muted-foreground' }
  };

  const groupAbsencesByWorker = (absencesArray) => {
    const map = {};
    absencesArray.forEach(a => {
      if (!map[a.workerId]) map[a.workerId] = { worker: workersMap[a.workerId], items: [] };
      map[a.workerId].items.push(a);
    });
    // Return sorted array by worker name, and inside items sorted by dateStart asc
    return Object.values(map)
      .sort((a,b) => a.worker.name.localeCompare(b.worker.name))
      .map(wg => {
        wg.items.sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));
        return wg;
      });
  };

  if (absencesLoading && absences.length === 0) return <div className="p-8 text-muted-foreground flex items-center gap-2"><RefreshCw className="animate-spin" size={16} /> {t('absences.loading')}</div>;

  return (
    <div className="flex-1 w-full p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('absences.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('absences.subtitle')}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={openCreateModal} className="gap-2 shrink-0">
            <Plus size={16} /> {t('absences.add')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border/50">
        <button
          className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'LIST' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('LIST')}
        >
          {t('absences.tab_list', { defaultValue: 'Lista de Ausencias' })}
        </button>
        <button
          className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'DASHBOARD' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('DASHBOARD')}
        >
          {t('absences.tab_dashboard', { defaultValue: 'Calendario' })}
        </button>
      </div>

      {activeTab === 'LIST' ? (
        <>
          <div className="flex gap-4 flex-wrap bg-muted/20 p-4 rounded-xl border items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            placeholder={t('absences.search')} 
            className="pl-9 bg-background" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex gap-1.5 p-1 bg-muted/50 rounded-lg">
          {[
            { id: 'ALL', label: t('absences.filter_all') },
            { id: 'ACTIVE', label: t('absences.filter_active') },
            { id: 'FUTURE', label: t('absences.filter_future') },
            { id: 'PAST', label: t('absences.filter_past') }
          ].map(f => (
            <Button 
              key={f.id} 
              variant={timeFilter === f.id ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setTimeFilter(f.id)}
              className={timeFilter === f.id ? 'shadow-sm' : ''}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {filteredAbsences.length === 0 ? (
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm p-12 text-center flex flex-col items-center">
            <Calendar size={48} className="text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">{t('absences.empty_title')}</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">{t('absences.empty_body')}</p>
          </div>
        ) : (
          ['ACTIVE', 'FUTURE', 'PAST'].map(groupKey => {
            const timeAbsences = groupedAbsences[groupKey];
            if (timeAbsences.length === 0) return null;
            
            const workerGroups = groupAbsencesByWorker(timeAbsences);
            const tg = timeGroupLabels[groupKey];

            return (
              <div key={groupKey} className="space-y-3">
                <h2 className={`font-semibold text-lg flex items-center gap-2 ${tg.color}`}>
                  {tg.title}
                  <span className="text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {t('absences.count', { count: timeAbsences.length })}
                  </span>
                </h2>
                
                <div className="bg-card border rounded-xl overflow-hidden shadow-sm divide-y">
                  {workerGroups.map(wg => (
                    <div key={wg.worker.id} className="flex flex-col md:flex-row border-b last:border-0 hover:bg-muted/5 transition-colors">
                      {/* Worker Info Column */}
                      <div className="p-4 md:w-1/3 flex items-start gap-4 md:border-r border-border/50 bg-muted/10 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User size={18} className="text-primary" />
                        </div>
                        <div className="flex-1">
                          <Link to="/staff/$workerId" params={{ workerId: String(wg.worker.id) }} className="font-semibold text-[15px] hover:underline block">
                            {wg.worker.name}
                          </Link>
                          <span className={`mt-1 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${tg.badgeClass}`}>
                            {tg.title}
                          </span>
                          <div className="mt-4">
                            <Link to="/staff/$workerId" params={{ workerId: String(wg.worker.id) }}>
                              <Button variant="outline" size="sm" className="w-full h-8 text-xs">{t('absences.btn_view')}</Button>
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Absences Rows */}
                      <div className="flex-1 divide-y">
                        {wg.items.map(absence => {
                          const subLabel = getSubLabel(absence);
                          const cov = coverageData[absence.id];
                          
                          return (
                            <div key={absence.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="text-sm font-medium flex items-center gap-2">
                                  <span>{t('absences.date_range', { start: absence.dateStart, end: absence.dateEnd })}</span>
                                  {subLabel && (
                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${subLabel.color}`}>
                                      {subLabel.text}
                                    </span>
                                  )}
                                  
                                  {cov && cov.required && groupKey !== 'PAST' && (
                                    cov.isFullyCovered ? (
                                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                                        {t('absences.fully_covered')}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 animate-pulse">
                                        {t('absences.shifts_missing', { count: cov.uncoveredCount })}
                                      </span>
                                    )
                                  )}
                                </div>
                                <div className="text-sm mt-1 text-muted-foreground">
                                  {ABSENCE_TYPE_LABELS[absence.type] || absence.type}
                                </div>
                                {absence.note && (
                                  <div className="mt-2 text-xs italic text-muted-foreground bg-muted p-2 rounded max-w-sm" title={absence.note}>
                                    {absence.note}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-4 sm:mt-0 sm:ml-4 shrink-0">
                                {wg.worker.category === 'FIJO' && groupKey !== 'PAST' && (
                                  <Button variant="secondary" size="sm" onClick={() => { setImpactModalAbsence(absence); loadImpactData(absence); }}>
                                    {t('absences.btn_manage')}
                                  </Button>
                                )}
                                <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleEdit(absence)} title={t('absences.btn_edit')}>
                                  <Edit size={14} />
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(absence.id)} title={t('absences.btn_delete')}>
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
      </>
      ) : (
        <AbsencesDashboard 
          dashboardDate={dashboardDate}
          setDashboardDate={setDashboardDate}
          workersMap={workersMap}
          absences={absences}
          t={t}
        />
      )}

      <Modal isOpen={isAbsenceModalOpen} onClose={() => { setAbsenceModalOpen(false); setAbsenceError(''); setImpactData(null); }} title={impactData ? t('absences.modal_impact_title') : (editingAbsenceId ? t('absences.modal_edit_title') : t('absences.modal_create_title'))}>
        {!impactData ? (
        <form onSubmit={handleCheckImpact} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('absences.modal_worker')}</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
              value={absenceForm.workerId} 
              onChange={e => setAbsenceForm({ ...absenceForm, workerId: e.target.value })}
              required
              disabled={!!editingAbsenceId}
            >
              <option value="" disabled>{t('absences.modal_select_worker')}</option>
              {Object.values(workersMap)
                .sort((a,b) => a.name.localeCompare(b.name))
                .map(w => <option key={w.id} value={w.id}>{w.name}</option>)
              }
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('absences.modal_reason')}</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
              value={absenceForm.type} 
              onChange={e => setAbsenceForm({ ...absenceForm, type: e.target.value })}
            >
              {ABSENCE_TYPES.map(t => <option key={t} value={t}>{ABSENCE_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('absences.modal_from')}</label>
              <Input required type="date" value={absenceForm.dateStart} onChange={e => setAbsenceForm({ ...absenceForm, dateStart: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('absences.modal_until')}</label>
              <Input required type="date" min={absenceForm.dateStart} value={absenceForm.dateEnd} onChange={e => setAbsenceForm({ ...absenceForm, dateEnd: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex justify-between">
              {t('absences.modal_notes')}
              <span className="text-xs text-muted-foreground font-normal">{t('absences.modal_optional')}</span>
            </label>
            <textarea className="flex w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              value={absenceForm.note} onChange={e => setAbsenceForm({ ...absenceForm, note: e.target.value })} placeholder="Ej: Certificado entregado al departamento de RRHH..." />
          </div>
          
          {noticeWarningMsg && (
            <div className="bg-amber-100/50 border-l-4 border-amber-500 text-amber-800 p-3 rounded text-sm mb-4 flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 shrink-0" />
              <span>{noticeWarningMsg}</span>
            </div>
          )}

          {absenceError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-md border border-red-200 dark:border-red-800/50 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{absenceError}</span>
            </div>
          )}
          
          <div className="pt-2 flex justify-end gap-2 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => { setAbsenceModalOpen(false); setAbsenceError(''); }}>{t('absences.modal_cancel')}</Button>
            <Button type="submit" disabled={isCheckingImpact}>
              {isCheckingImpact ? t('absences.modal_checking') : t('absences.modal_save')}
            </Button>
          </div>
        </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-4 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t('absences.impact_warning', { count: impactData.length })}</p>
                <p className="text-sm opacity-90 mt-1">{t('absences.impact_hint')}</p>
              </div>
            </div>

            <div className="max-h-[200px] overflow-y-auto border rounded-md divide-y">
              {impactData.map((cell, idx) => (
                <div key={idx} className="p-3 bg-card flex justify-between items-center text-sm">
                  <div>
                    <span className="font-semibold block">{cell.date}</span>
                    <span className="text-muted-foreground">{cell.profileName} ({cell.timeSlot.startTime} - {cell.timeSlot.endTime})</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-between gap-2 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setImpactData(null)}>{t('absences.impact_back')}</Button>
              <div className="flex gap-2">
                <Button type="button" onClick={async () => {
                  await executeSave();
                }}>
                  {t('absences.impact_save_anyway')}
                </Button>
                <Button type="button" onClick={async () => {
                  await executeSave();
                  navigate({ to: '/calendar' });
                }} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {t('absences.impact_save_and_go')} <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* View/Manage Impact Modal */}
      <Modal isOpen={!!impactModalAbsence} onClose={() => { setImpactModalAbsence(null); refreshGlobalAbsences(); }} title={t('absences.manage_title')}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('absences.manage_body')}
          </p>
          
          {isImpactLoading ? (
            <div className="p-8 text-center text-muted-foreground flex justify-center"><RefreshCw className="animate-spin" size={20} /></div>
          ) : impactModalData?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              {t('absences.manage_no_shifts')}
            </div>
          ) : (
            <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
              {impactModalData?.map((cell, idx) => {
                const isUncovered = cell.status === 'UNCOVERED';
                const isPast = cell.date < now;
                
                return (
                  <div key={idx} className={`p-3 flex justify-between items-center text-sm ${isUncovered ? 'bg-red-50 dark:bg-red-950/20' : 'bg-card'} ${isPast ? 'opacity-60 grayscale' : ''}`}>
                    <div>
                      <span className="font-semibold block">{new Date(cell.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="text-muted-foreground text-xs">{cell.profileName} ({cell.timeSlot.startTime} - {cell.timeSlot.endTime})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${isUncovered ? 'text-red-500' : 'text-foreground'}`}>
                        {isUncovered ? t('absences.manage_uncovered') : cell.allocatedWorkerName}
                      </span>
                      {isPast ? (
                        <Button size="sm" variant="ghost" disabled>{t('absences.manage_past')}</Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant={isUncovered ? 'default' : 'outline'}
                          onClick={() => setSelectedCellForAssignment({ 
                            profile: { profileId: cell.profileId, profileName: cell.profileName },
                            date: cell.date,
                            cellData: cell
                          })}
                        >
                          {isUncovered ? t('absences.manage_assign') : t('absences.manage_modify')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-4 mt-2 border-t">
            <Button onClick={() => setImpactModalAbsence(null)}>{t('absences.manage_close')}</Button>
          </div>
        </div>
      </Modal>

      {selectedCellForAssignment && (
        <AssignmentModal 
          isOpen={true} 
          onClose={() => { 
            setSelectedCellForAssignment(null); 
            if (impactModalAbsence) loadImpactData(impactModalAbsence); 
          }} 
          cellInfo={selectedCellForAssignment} 
        />
      )}

    </div>
  );
}
