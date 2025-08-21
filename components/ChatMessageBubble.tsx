
import React, { useMemo, useState, useRef } from 'react';
import type { ChatMessage } from '../types';
import { MessageRole } from '../types';
import UserIcon from './icons/UserIcon';
import BotIcon from './icons/BotIcon';
import MarkdownTable from './MarkdownTable';
import DataChart from './DataChart';
import CopyIcon from './icons/CopyIcon';
import ShareIcon from './icons/ShareIcon';
import DeleteIcon from './icons/DeleteIcon';
import PdfIcon from './icons/PdfIcon';
import type { Chart as ChartJS } from 'chart.js';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onDelete: () => void;
}

// Helper component for simple markdown (**bold**)
const SimpleMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </>
  );
};


const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, onDelete }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const chartRefs = useRef<(ChartJS | null)[]>([]);

  const isUser = message.role === MessageRole.USER;
  const showShareButton = typeof navigator.share === 'function';

  const bubbleClasses = isUser ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-800 dark:bg-gray-700 dark:text-slate-200';
  const icon = isUser ? <UserIcon /> : <BotIcon />;

  const contentParts = useMemo(() => {
    chartRefs.current = []; // Reset refs on re-render
    if (isUser || !message.text) {
      return [{ type: 'text', content: message.text }];
    }

    // Regex to find either a chart block or a markdown table block, globally.
    // Group 1: Chart JSON content
    // Group 2: Table string content
    const combinedRegex = /\[CHART_DATA\](.*?)\[\/CHART_DATA\]|((?:\|\s*.*?\s*\|(?:\r?\n|\r|$))+)/gs;

    const parts = [];
    let lastIndex = 0;
    let match;

    // Reset regex state for exec
    combinedRegex.lastIndex = 0;

    while ((match = combinedRegex.exec(message.text)) !== null) {
      // 1. Add any text that came before this match
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: message.text.substring(lastIndex, match.index) });
      }

      const chartJson = match[1];
      const tableString = match[2];

      // 2. Add the matched part (chart or table)
      if (chartJson) {
        try {
          const chartData = JSON.parse(chartJson.trim());
          parts.push({ type: 'chart', content: chartData });
        } catch (e) {
          console.error("Gagal mem-parsing JSON grafik:", e, "JSON string mentah:", chartJson);
          // If parsing fails, render the original block as text to show what went wrong.
          parts.push({ type: 'text', content: match[0] });
        }
      } else if (tableString) {
        parts.push({ type: 'table', content: tableString });
      }

      // 3. Update the last index to the end of the current match
      lastIndex = combinedRegex.lastIndex;
    }

    // 4. Add any remaining text after the last match
    if (lastIndex < message.text.length) {
      parts.push({ type: 'text', content: message.text.substring(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: message.text }];
  }, [message.text, isUser]);
  
  const handleCopy = () => {
    // Salin hanya teks, tanpa data grafik
    const textToCopy = contentParts
      .filter(p => p.type === 'text' || p.type === 'table')
      .map(p => p.content)
      .join('\n');

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  const handleShare = async () => {
    if (showShareButton) {
      try {
         const textToShare = contentParts
          .filter(p => p.type === 'text' || p.type === 'table')
          .map(p => p.content)
          .join('\n');
        await navigator.share({ title: 'Pesan dari Asisten Guru AI', text: textToShare });
      } catch (error) {
        console.error('Gagal membagikan:', error);
      }
    }
  };

  const handleExportPdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });
    
    let yPos = 15; // Starting Y position with margin
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - (margin * 2);

    const checkAndAddPage = (requiredHeight: number) => {
      if (yPos + requiredHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPos = margin;
      }
    };
    
    let chartCounter = 0;
    for (const part of contentParts) {
      if (part.type === 'text' && part.content.trim()) {
        const splitText = doc.splitTextToSize(part.content, usableWidth);
        const textHeight = splitText.length * 5; // Approximate height
        checkAndAddPage(textHeight);
        doc.text(splitText, margin, yPos);
        yPos += textHeight + 5;
      } else if (part.type === 'table') {
        const lines = part.content.trim().split('\n').filter((line: string) => line.includes('|'));
        if (lines.length >= 2) {
          const parseRow = (row: string): string[] => row.slice(1, -1).split('|').map(cell => cell.trim());
          const headers = parseRow(lines[0]);
          const body = lines.slice(2).map(line => parseRow(line));
          
          autoTable(doc, {
            head: [headers],
            body: body,
            startY: yPos,
            margin: { left: margin, right: margin },
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      } else if (part.type === 'chart') {
        const chartRef = chartRefs.current[chartCounter];
        chartCounter++;
        if (chartRef) {
          const imgData = chartRef.toBase64Image();
          const imgProps = doc.getImageProperties(imgData);
          const pdfHeight = (imgProps.height * usableWidth) / imgProps.width;
          checkAndAddPage(pdfHeight);
          doc.addImage(imgData, 'PNG', margin, yPos, usableWidth, pdfHeight);
          yPos += pdfHeight + 10;
        }
      }
    }
    
    doc.save(`pesan-chat-${new Date().getTime()}.pdf`);
  };

  let chartIndexCounter = 0;

  return (
    <div className={`group flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="flex-shrink-0">{icon}</div>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`max-w-md md:max-w-lg lg:max-w-2xl px-4 py-3 rounded-2xl shadow-sm ${bubbleClasses}`}
        >
          {contentParts.map((part, index) => {
            if (part.type === 'table') {
              return <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-2 my-2"><MarkdownTable tableString={part.content} /></div>;
            }
            if (part.type === 'chart') {
              const chart = part.content;
              const currentChartIndex = chartIndexCounter++;
              return <DataChart 
                        key={index} 
                        ref={(el: ChartJS | null) => { if(el) chartRefs.current[currentChartIndex] = el; }} 
                        type={chart.type} 
                        title={chart.title} 
                        chartData={chart.data} 
                     />;
            }
            return part.content.trim() ? <p key={index} className="whitespace-pre-wrap"><SimpleMarkdownRenderer text={part.content} /></p> : null;
          })}
        </div>
        <div className="flex items-center transition-opacity duration-200 opacity-0 group-hover:opacity-100 mt-1">
           <button onClick={handleCopy} title={copyStatus === 'copied' ? 'Disalin!' : 'Salin Pesan'} className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
              <CopyIcon />
          </button>
          {showShareButton && (
            <button onClick={handleShare} title="Bagikan" className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
              <ShareIcon />
            </button>
          )}
          {!isUser && (
            <button onClick={handleExportPdf} title="Simpan sebagai PDF" className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
              <PdfIcon />
            </button>
          )}
          <button onClick={onDelete} title="Hapus" className="p-2 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-500">
            <DeleteIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;
