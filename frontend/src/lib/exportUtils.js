import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Generates a professional Excel file from the calendar matrix data.
 * @param {Array} matrixData - The flat array of cell objects from useCalendarStore.
 * @param {Object} i18n - The i18next instance to use for translations.
 * @param {Array} areas - Global areas to use for grouping.
 * @param {Array} shifts - Global shifts to use for separators.
 * @param {Object} options - Export options (e.g., showUncovered).
 * @param {string} title - Optional title for the filename.
 */
export const exportToExcel = async (matrixData, i18n, areas = [], shifts = [], options = { showUncovered: true }, title = 'Calendar') => {
  if (!matrixData || matrixData.length === 0) return;

  const t = i18n.t.bind(i18n);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Calendar', {
    properties: { defaultRowHeight: 20 },
    views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }]
  });

  // 1. Extract and sort unique dates (Columns)
  const uniqueDates = Array.from(new Set(matrixData.map(d => d.date))).sort();
  
  // 2. Prepare Headers
  const columns = [
    { header: t('calendar.profile', 'Perfil'), key: 'profile', width: 25 }
  ];

  uniqueDates.forEach(d => {
    const dateObj = new Date(d);
    const headerStr = dateObj.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', { weekday: 'short', day: 'numeric' });
    columns.push({ header: headerStr, key: d, width: 15 });
  });

  sheet.columns = columns;

  // 2.5 Add Title Row with Date Range
  const firstDate = new Date(uniqueDates[0]).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const lastDate = new Date(uniqueDates[uniqueDates.length - 1]).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const rangeHeader = `${t('calendar.view', 'Vista')}: ${firstDate} - ${lastDate}`;

  sheet.insertRow(1, { profile: rangeHeader.toUpperCase() });
  sheet.getRow(1).height = 35;
  sheet.mergeCells(1, 1, 1, columns.length);
  
  const titleCell = sheet.getCell(1, 1);
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF333333' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFFFF' }
  };

  // Header Styling (Now at Row 2)
  const headerRow = sheet.getRow(2);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF333333' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };
  });

  // 3. Group by Area and Shift
  const profileMap = {};
  matrixData.forEach(cell => {
    if (!profileMap[cell.profileId]) {
      profileMap[cell.profileId] = {
        name: cell.profileName,
        areaId: cell.areaId,
        shiftId: cell.shiftId,
        id: cell.profileId,
        data: {} // date -> cellObj
      };
    }
    profileMap[cell.profileId].data[cell.date] = cell;
  });

  // Sort profiles by Area > Shift > Name
  const sortedProfiles = Object.values(profileMap).sort((a, b) => {
    if (a.areaId !== b.areaId) return a.areaId - b.areaId;
    if (a.shiftId !== b.shiftId) return a.shiftId - b.shiftId;
    return a.name.localeCompare(b.name);
  });

  // 4. Fill Rows with grouping headers
  let currentAreaId = null;
  let currentShiftId = null;

  sortedProfiles.forEach((p) => {
    // Add Area separator if area changes
    if (p.areaId !== currentAreaId) {
      currentAreaId = p.areaId;
      currentShiftId = p.shiftId; // Reset shift tracking for new area
      const area = areas.find(a => a.id === currentAreaId);
      const areaName = area ? area.name : `Area ${currentAreaId}`;
      
      const areaRow = sheet.addRow({ profile: areaName.toUpperCase() });
      areaRow.height = 25;
      sheet.mergeCells(areaRow.number, 1, areaRow.number, columns.length);
      
      const cell = areaRow.getCell(1);
      cell.font = { bold: true, size: 12 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEEEEE' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      cell.border = { bottom: { style: 'medium' } };
    } else if (p.shiftId !== currentShiftId) {
        // Add a small spacer row between different shifts in the same area
        currentShiftId = p.shiftId;
        const shift = shifts.find(s => s.id === currentShiftId);
        const shiftName = shift ? shift.name : `Shift ${currentShiftId}`;
        
        const spacerRow = sheet.addRow({ profile: shiftName.toUpperCase() });
        spacerRow.height = 16; // Small height but enough for text
        sheet.mergeCells(spacerRow.number, 1, spacerRow.number, columns.length);
        
        const cell = spacerRow.getCell(1);
        cell.font = { italic: true, size: 8, color: { argb: 'FF000000' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' } // Very light gray
        };
    }

    // Prepare profile row data
    const rowData = { profile: p.name };
    uniqueDates.forEach(date => {
      const cellData = p.data[date];
      if (cellData) {
        if (cellData.status === 'UNCOVERED' && !options.showUncovered) {
          rowData[date] = ''; // Completely blank
        } else {
          let content = `${cellData.timeSlot.startTime} - ${cellData.timeSlot.endTime}`;
          if (cellData.status === 'UNCOVERED') {
            content += `\n(${t('calendar.uncovered', 'SIN CUBRIR')})`;
          } else {
            content += `\n${cellData.allocatedWorkerName || ''}`;
            if (cellData.trainee) {
              content += `\n[${cellData.trainee.name}]`;
            }
          }
          rowData[date] = content;
        }
      }
    });

    const row = sheet.addRow(rowData);
    row.height = 30; // More compact height

    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      if (colNumber > 1) { // Skip profile name column for color coding
        const dateKey = columns[colNumber - 1].key;
        const cellData = p.data[dateKey];
        
        if (cellData) {
          if (cellData.status === 'UNCOVERED') {
            if (options.showUncovered) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFEAEA' } // Light red
              };
              cell.font = { color: { argb: 'FFCC0000' }, bold: true, size: 8 };
            } else {
              // Completely blank cell, no color, no font style
              cell.fill = undefined;
              cell.font = { size: 8 };
            }
          } else if (cellData.isOverride) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFEAF4FF' } // Light blue
            };
            cell.font = { size: 8 };
          } else {
            cell.font = { size: 8 };
          }
        }
      } else {
          cell.font = { bold: true, size: 9 };
          cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 0.5 };
      }
    });
  });

  // 5. Generate Buffer and Save
  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = uniqueDates[0] ? `${uniqueDates[0]}_to_${uniqueDates[uniqueDates.length - 1]}` : 'export';
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${title}_${dateStr}.xlsx`);
};
