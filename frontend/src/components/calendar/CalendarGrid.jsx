import { useState, useMemo } from 'react';
import { useCalendarStore } from '../../stores/calendarStore';
import { useConfigStore } from '../../stores/configStore';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, AlertCircle, GraduationCap } from 'lucide-react';
import AssignmentModal from './AssignmentModal';

const getDayNames = (t) => ({
  full: [
    t('days.monday'), t('days.tuesday'), t('days.wednesday'), 
    t('days.thursday'), t('days.friday'), t('days.saturday'), t('days.sunday')
  ],
  short: [
    t('days.monday_short'), t('days.tuesday_short'), t('days.wednesday_short'), 
    t('days.thursday_short'), t('days.friday_short'), t('days.saturday_short'), t('days.sunday_short')
  ]
});

export default function CalendarGrid() {
  const { t } = useTranslation();
  const { matrixData, groupMode, viewMode, getStartEndDates } = useCalendarStore();
  const { areas, shifts } = useConfigStore();
  const { startDateObj, endDateObj } = getStartEndDates();

  const dayNames = useMemo(() => getDayNames(t), [t]);
  
  const [selectedCell, setSelectedCell] = useState(null);

  // 1. Generate column headers (dates)
  const columns = useMemo(() => {
    const cols = [];
    let cur = new Date(startDateObj);
    while (cur <= endDateObj) {
      const dateStr = cur.toISOString().split('T')[0];
      const jsDay = cur.getDay();
      const weekDay = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon, 6=Sun
      cols.push({
        date: dateStr,
        dayStr: viewMode === 'week' ? dayNames.full[weekDay] : dayNames.short[weekDay],
        dayNum: cur.getDate(),
        isWeekend: weekDay >= 5
      });
      cur.setDate(cur.getDate() + 1);
    }
    return cols;
  }, [startDateObj, endDateObj, viewMode]);

  // 2. Group matrix Data by row (Profiles)
  // Rows structure based on grouping mode
  const rows = useMemo(() => {
    if (!matrixData || matrixData.length === 0) return [];
    
    // Group purely by Profile ID first to collect all days for each profile
    const profileMap = new Map();
    matrixData.forEach(cell => {
      if (!profileMap.has(cell.profileId)) {
        profileMap.set(cell.profileId, {
          profileId: cell.profileId,
          profileName: cell.profileName,
          shiftId: cell.shiftId,
          areaId: cell.areaId,
          days: {}
        });
      }
      profileMap.get(cell.profileId).days[cell.date] = cell;
    });

    const allProfiles = Array.from(profileMap.values());

    let finalGroups = [];

    if (groupMode === 'shift') {
      const groupedByShift = {};
      allProfiles.forEach(p => {
        const k1 = p.shiftId || 'none';
        const k2 = p.areaId || 'none';
        if (!groupedByShift[k1]) groupedByShift[k1] = {};
        if (!groupedByShift[k1][k2]) groupedByShift[k1][k2] = [];
        groupedByShift[k1][k2].push(p);
      });

      const sortedShifts = shifts.map(s => s.id.toString());
      const sortedAreas = areas.map(a => a.id.toString());

      finalGroups = Object.keys(groupedByShift).sort((a,b) => {
        if(a==='none') return 1; if(b==='none') return -1;
        return sortedShifts.indexOf(a) - sortedShifts.indexOf(b);
      }).map(shiftId => {
        const s = shifts.find(x => x.id.toString() === shiftId);
        
        const subGroups = Object.keys(groupedByShift[shiftId]).sort((a,b) => {
           if(a==='none') return 1; if(b==='none') return -1;
           return sortedAreas.indexOf(a) - sortedAreas.indexOf(b);
        }).map(areaId => {
           const a = areas.find(x => x.id.toString() === areaId);
           return {
             id: areaId,
             title: a ? a.name : t('calendar.no_area'),
             color: a ? a.color : 'transparent',
             profiles: groupedByShift[shiftId][areaId].sort((p1,p2)=>p1.profileName.localeCompare(p2.profileName))
           }
        });

        return {
          id: shiftId,
          title: s ? s.name : t('calendar.no_shift'),
          color: 'transparent',
          subGroups
        };
      });
    } else {
      // Group by Area then Shift
      const groupedByArea = {};
      allProfiles.forEach(p => {
        const k1 = p.areaId || 'none';
        const k2 = p.shiftId || 'none';
        if (!groupedByArea[k1]) groupedByArea[k1] = {};
        if (!groupedByArea[k1][k2]) groupedByArea[k1][k2] = [];
        groupedByArea[k1][k2].push(p);
      });

      const sortedAreas = areas.map(a => a.id.toString());
      const sortedShifts = shifts.map(s => s.id.toString());

      finalGroups = Object.keys(groupedByArea).sort((a,b) => {
        if(a==='none') return 1; if(b==='none') return -1;
        return sortedAreas.indexOf(a) - sortedAreas.indexOf(b);
      }).map(areaId => {
        const a = areas.find(x => x.id.toString() === areaId);
        
        const subGroups = Object.keys(groupedByArea[areaId]).sort((a,b) => {
           if(a==='none') return 1; if(b==='none') return -1;
           return sortedShifts.indexOf(a) - sortedShifts.indexOf(b);
        }).map(shiftId => {
           const s = shifts.find(x => x.id.toString() === shiftId);
           return {
             id: shiftId,
             title: s ? s.name : t('calendar.no_shift'),
             color: 'transparent',
             profiles: groupedByArea[areaId][shiftId].sort((p1,p2)=>p1.profileName.localeCompare(p2.profileName))
           }
        });

        return {
          id: areaId,
          title: a ? a.name : t('calendar.no_area'),
          color: a ? a.color : 'transparent',
          subGroups
        };
      });
    }

    return finalGroups;
  }, [matrixData, groupMode, shifts, areas]);

  const handleCellClick = (profile, colDate, cellData) => {
    setSelectedCell({
      profile,
      date: colDate,
      cellData
    });
  };

  return (
    <>
      <div className="min-w-max relative pb-10">
        {/* Header Row */}
        <div className="sticky top-0 z-40 flex border-b bg-background shadow-sm">
          {/* Top Left Corner */}
          <div className="sticky left-0 z-50 w-48 shrink-0 border-r bg-muted p-3 flex items-center justify-center font-semibold text-sm shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#1f2937]">
            {groupMode === 'shift' ? t('calendar.header_shifts') : t('calendar.header_areas')}
          </div>
          
          {/* Dates Columns */}
          <div className="flex-1 flex">
            {columns.map(col => (
              <div 
                key={col.date} 
                className={`flex-1 min-w-28 p-2 border-r text-center flex flex-col justify-center
                  ${col.isWeekend ? 'bg-muted/10' : 'bg-background'}
                  ${col.date === new Date().toISOString().split('T')[0] ? 'border-b-2 border-b-primary ring-inset ring-1 ring-primary/20' : ''}
                `}
              >
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">{col.dayStr}</span>
                <span className={`text-lg my-0.5 ${col.isWeekend ? 'text-muted-foreground font-medium' : 'font-bold'}`}>{col.dayNum}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        {rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground italic">
            {t('calendar.waiting')}
          </div>
        ) : rows.map(group => (
          <div key={group.id} className="mb-4">
            {/* Top Level Group Header */}
            <div className="flex w-full bg-muted/60 border-b border-t shadow-sm">
              <div className="sticky left-0 flex items-center gap-2 p-2.5 bg-muted/60 z-30 w-max pl-4 rounded-r-xl">
                {group.color !== 'transparent' && <div className="w-4 h-4 rounded-full" style={{ backgroundColor: group.color }} />}
                <h3 className="font-bold text-foreground uppercase tracking-widest text-[13px]">{group.title}</h3>
              </div>
            </div>

            {/* Subgroups */}
            {group.subGroups.map(subGroup => (
              <div key={subGroup.id} className="mb-0">
                {/* SubGroup Header */}
                <div className="flex w-full bg-muted/20 border-b border-border/50">
                  <div className="sticky left-0 flex items-center gap-2 px-3 py-1.5 bg-muted/20 z-30 w-max pl-6 rounded-r-xl">
                    {subGroup.color !== 'transparent' && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subGroup.color }} />}
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{subGroup.title}</h4>
                  </div>
                </div>

                {/* Profile Rows */}
                {subGroup.profiles.map(profile => (
                  <div key={profile.profileId} className="flex border-b border-border/50 group hover:bg-muted/5 transition-colors">
                    {/* Profile Name Sticky Left */}
                    <div className="sticky left-0 z-30 w-48 shrink-0 border-r bg-white p-3 flex flex-col justify-center shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#1f2937]">
                      <span className="text-sm font-medium leading-tight pl-4">{profile.profileName}</span>
                    </div>

                    {/* Day Cells */}
                    <div className="flex-1 flex">
                      {columns.map(col => {
                        const cell = profile.days[col.date];
                        if (!cell) {
                          // Profile does not work this day
                          return (
                            <div key={col.date} className={`flex-1 min-w-28 border-r border-border/50 p-1 flex items-center justify-center ${col.isWeekend ? 'bg-muted/5' : ''}`}>
                              <div className="w-full h-full rounded border border-dashed border-border/40 bg-muted/10"></div>
                            </div>
                          );
                        }

                        // Profile works this day
                        const isUncovered = cell.status === 'UNCOVERED';
                        const isOverride = cell.isOverride;
                        const hasTrainee = !!cell.trainee;
                        const isTraineeAlone = hasTrainee && isUncovered;
                        
                        return (
                          <div 
                            key={col.date} 
                            onClick={() => handleCellClick(profile, col.date, cell)}
                            className={`flex-1 min-w-28 border-r border-border/50 p-1.5 cursor-pointer relative transition-all active:scale-95
                              ${col.isWeekend ? 'bg-muted/5' : ''}
                              hover:ring-1 hover:ring-primary hover:z-10 hover:shadow-sm
                            `}
                          >
                            <div className={`w-full h-full min-h-16 rounded-md p-1.5 flex flex-col justify-between border shadow-sm relative overflow-hidden
                              ${isTraineeAlone 
                                ? 'bg-red-50 border-red-400 dark:bg-red-950/50 dark:border-red-800' // High alert: trainee alone
                                : isUncovered 
                                  ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50' 
                                  : isOverride
                                    ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/50'
                                    : 'bg-background border-border/50'}
                            `}>
                              {/* Time */}
                              <div className="text-[10px] text-muted-foreground font-medium flex justify-between items-start">
                                <span>{cell.timeSlot.startTime} - {cell.timeSlot.endTime}</span>
                                {isOverride && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 mr-0.5" title={t('calendar.manual_override')} />}
                              </div>

                              {/* Content */}
                              <div className="mt-1 flex-1 flex items-center justify-center">
                                {isUncovered ? (
                                  <div className="flex flex-col items-center gap-1 text-red-500 dark:text-red-400">
                                    <AlertCircle size={18} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-none">{t('calendar.uncovered')}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-semibold text-center leading-tight truncate px-1 text-foreground">
                                    {cell.allocatedWorkerName}
                                  </span>
                                )}
                              </div>

                              {/* Trainee Footer */}
                              {hasTrainee && (
                                <div className={`absolute bottom-0 left-0 right-0 py-0.5 px-1 flex items-center justify-center gap-1 border-t
                                  ${isTraineeAlone ? 'bg-red-500 text-white border-red-600' : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50'}
                                `}>
                                  <GraduationCap size={10} className="shrink-0" />
                                  <span className="text-[9px] font-bold leading-none truncate uppercase tracking-widest" title={cell.trainee.name}>
                                    {cell.trainee.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Override Modal */}
      {selectedCell && (
        <AssignmentModal 
          isOpen={!!selectedCell}
          onClose={() => setSelectedCell(null)}
          cellInfo={selectedCell}
        />
      )}
    </>
  );
}
