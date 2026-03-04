import React, { useState, useEffect, useMemo } from 'react';
import { CalendarAPI } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, eachDayOfInterval, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

export default function WorkerAnalytics({ worker, absences }) {
  const currentRealYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentRealYear);
  const [yearData, setYearData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Available years: from 2 years ago to 1 year in future
  const years = Array.from({ length: 4 }, (_, i) => currentRealYear - 2 + i);

  useEffect(() => {
    const fetchYearData = async () => {
      setLoading(true);
      try {
        const start = `${selectedYear}-01-01`;
        const end = `${selectedYear}-12-31`;
        const matrix = await CalendarAPI.getMatrix(start, end);
        
        // Filter matrix for this specific worker
        const workerShifts = matrix.filter(c => c.allocatedWorkerId === worker.id);
        setYearData(workerShifts);
      } catch (err) {
        console.error("Failed to load year matrix for analytics:", err);
      }
      setLoading(false);
    };
    
    if (worker) {
      fetchYearData();
    }
  }, [worker, selectedYear]);

  // Compute stats
  const stats = useMemo(() => {
    let workedDays = new Set();
    yearData.forEach(s => workedDays.add(s.date));

    let absenceDays = new Set();
    
    // Process absences matching the selected year
    const processAbsence = (a) => {
      // rough intersection check
      if (a.dateStart > `${selectedYear}-12-31` || a.dateEnd < `${selectedYear}-01-01`) return;
      const start = a.dateStart < `${selectedYear}-01-01` ? new Date(`${selectedYear}-01-01`) : new Date(a.dateStart);
      const end = a.dateEnd > `${selectedYear}-12-31` ? new Date(`${selectedYear}-12-31`) : new Date(a.dateEnd);
      
      const dates = eachDayOfInterval({ start, end });
      dates.forEach(d => absenceDays.add(d.toISOString().split('T')[0]));
    };

    absences?.active?.forEach(processAbsence);
    absences?.past?.forEach(processAbsence);
    absences?.future?.forEach(processAbsence);

    // Profile distribution for Recharts
    const profileCounts = {};
    yearData.forEach(s => {
      profileCounts[s.profileName] = (profileCounts[s.profileName] || 0) + 1;
    });

    const chartData = Object.keys(profileCounts).map(name => ({
      name,
      turnos: profileCounts[name]
    })).sort((a,b) => b.turnos - a.turnos);

    return {
      totalWorked: workedDays.size,
      totalAbsences: absenceDays.size,
      chartData
    };
  }, [yearData, absences, selectedYear]);

  // GitHub Style Full Year Heatmap Grid
  const ActivityGrid = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Generate all days in the year
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Build columns
    // Week starts on Monday
    const weeks = [];
    let currentWeek = [];
    
    // Padding start of year
    const startDayIndex = (startDate.getDay() + 6) % 7; // 0=Mon, 6=Sun
    for (let i = 0; i < startDayIndex; i++) {
        currentWeek.push(null);
    }

    allDays.forEach(date => {
        currentWeek.push(date);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    // Padding end of year
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(null);
        weeks.push(currentWeek);
    }

    // Determine month labels based on the first occurrence of a month in a week
    const monthLabels = [];
    let currentMonth = -1;
    weeks.forEach((week, index) => {
        const firstValidDay = week.find(d => d !== null);
        if (firstValidDay && firstValidDay.getMonth() !== currentMonth) {
            currentMonth = firstValidDay.getMonth();
            monthLabels.push({ index, label: format(firstValidDay, 'MMM', { locale: es }) });
        }
    });

    const getDayStyle = (dateStr, dateObj) => {
      const isAbsent = absences?.past?.some(a => dateStr >= a.dateStart && dateStr <= a.dateEnd) ||
                       absences?.active?.some(a => dateStr >= a.dateStart && dateStr <= a.dateEnd) ||
                       absences?.future?.some(a => dateStr >= a.dateStart && dateStr <= a.dateEnd);
      
      const isFut = isAfter(dateObj, today);

      let classes = '';

      if (isAbsent) {
          classes = 'bg-red-500';
      } else {
          // Default to assigned/worked if not absent
          classes = isFut ? 'bg-zinc-600 dark:bg-zinc-500' : 'bg-green-500';
      }

      if (isFut) {
         classes += ' opacity-40 shadow-inner border border-dashed border-foreground/30'; // Distinct look for future shade (this makes red look light red)
      } else {
         classes += ' shadow-[1px_1px_rgba(0,0,0,0.05)]';
      }
      return classes;
    };

    return (
      <div className="w-full pb-4">
        <div className="w-full">
          {/* Months Header */}
          <div className="flex text-[10px] text-muted-foreground font-medium mb-1.5" style={{ marginLeft: '24px' }}>
             <div className="relative w-full h-4">
               {monthLabels.map(m => (
                 <span key={m.label} className="absolute capitalize text-xs" style={{ left: `${(m.index / weeks.length) * 100}%` }}>
                   {m.label}
                 </span>
               ))}
             </div>
          </div>
          
          <div className="flex gap-1 w-full">
             {/* Days Y-Axis */}
             <div className="flex flex-col text-[10px] text-muted-foreground font-medium pr-1 shrink-0 justify-around pt-0.5 pb-0.5">
                <span className="leading-none text-xs">L</span>
                <span className="leading-none text-xs">M</span>
                <span className="leading-none text-xs">X</span>
                <span className="leading-none text-xs">J</span>
                <span className="leading-none text-xs">V</span>
                <span className="leading-none text-xs">S</span>
                <span className="leading-none text-xs">D</span>
             </div>

             {/* Grid */}
             <div className="flex gap-[2px] w-full">
               {weeks.map((week, wIndex) => (
                 <div key={wIndex} className="flex flex-col gap-[2px] flex-1">
                   {week.map((day, dIndex) => {
                     if (!day) return <div key={dIndex} className="w-full aspect-square rounded-[2px]" />;
                     const dateStr = format(day, 'yyyy-MM-dd');
                     const style = getDayStyle(dateStr, day);
                     const isFut = isAfter(day, today);
                     return (
                       <div 
                         key={dateStr} 
                         className={`w-full aspect-square rounded-[2px] transition-colors ${!isFut ? 'cursor-pointer hover:ring-1 hover:ring-primary scale-100 hover:scale-[1.15] z-10' : ''} ${style}`}
                         title={`${format(day, "d 'de' MMMM yyyy", { locale: es })}`}
                       />
                     );
                   })}
                 </div>
               ))}
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground justify-end pr-2 flex-wrap">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-zinc-600 opacity-40 border border-dashed border-foreground/30 rounded-[2px]" />Turno (Futuro)</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 opacity-40 border border-dashed border-foreground/30 rounded-[2px]" />Ausencia (Futuro)</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 shadow-sm rounded-[2px]" />Turno Trabajado</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 shadow-sm rounded-[2px]" />Ausencia (Pasado)</div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando métricas...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between pb-2">
         <h2 className="text-xl font-bold tracking-tight">Analíticas Anuales</h2>
         <select 
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
         >
            {years.map(y => <option key={y} value={y}>Año {y}</option>)}
         </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Turnos Cubiertos ({selectedYear})</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.totalWorked}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Días de Ausencia ({selectedYear})</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-red-500">{stats.totalAbsences}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Perfiles Dominados</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-blue-600">{(worker.capabilities?.length || 0) + (worker.fixedProfileId ? 1 : 0)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityGrid />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribución de Trabajo por Perfil ({selectedYear})</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {stats.chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">No hay datos suficientes para {selectedYear}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                <Bar dataKey="turnos" radius={[4, 4, 0, 0]}>
                  {stats.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} className="fill-primary" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
