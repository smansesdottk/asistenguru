
import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CsvIcon from './icons/CsvIcon';
import CopyIcon from './icons/CopyIcon';
import PdfIcon from './icons/PdfIcon';

interface MarkdownTableProps {
  tableString: string;
}

const MarkdownTable: React.FC<MarkdownTableProps> = ({ tableString }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const { headers, rows } = useMemo(() => {
    const lines = tableString.trim().split('\n').filter(line => line.includes('|'));
    if (lines.length < 2) return { headers: [], rows: [] };

    const parseRow = (row: string): string[] => {
      // Menghapus pipe di awal dan akhir, lalu memisahkan berdasarkan pipe
      return row.slice(1, -1).split('|').map(cell => cell.trim());
    };
    
    const tableHeaders = parseRow(lines[0]);
    // Baris kedua adalah pemisah, e.g., |---|---| jadi kita abaikan
    const tableRows = lines.slice(2).map(line => parseRow(line));

    return { headers: tableHeaders, rows: tableRows };
  }, [tableString]);

  const escapeCsvCell = (cell: string) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const handleExportCsv = () => {
    const csvContent = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map(row => row.map(escapeCsvCell).join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'export_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleExportPdf = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [headers],
      body: rows,
    });
    doc.save('export_data.pdf');
  };

  const handleCopy = () => {
    const tsvContent = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  if (headers.length === 0 || rows.length === 0) {
    return <p className="text-xs text-slate-500 dark:text-slate-400 italic">[Data tabel tidak lengkap]</p>;
  }


  return (
    <div className="my-1 text-slate-800 dark:text-slate-200">
      <div className="flex justify-end items-center gap-2 mb-1">
        <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded transition-colors" title="Salin Tabel">
          <CopyIcon />
          <span>{copyStatus === 'copied' ? 'Disalin!' : 'Salin'}</span>
        </button>
        <button onClick={handleExportCsv} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded transition-colors" title="Ekspor ke CSV">
          <CsvIcon />
          <span>CSV</span>
        </button>
        <button onClick={handleExportPdf} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded transition-colors" title="Ekspor ke PDF">
          <PdfIcon />
          <span>PDF</span>
        </button>
      </div>
      <div className="overflow-x-auto border border-slate-300 dark:border-gray-600 rounded-lg shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-100 dark:bg-gray-700">
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="px-4 py-2 font-semibold border-b border-slate-300 dark:border-gray-600 text-slate-700 dark:text-slate-200">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 border-b border-slate-200 dark:border-gray-700 last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2 text-slate-700 dark:text-slate-300">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarkdownTable;