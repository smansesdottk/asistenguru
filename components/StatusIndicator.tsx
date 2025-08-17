import React from 'react';

type Status = 'checking' | 'connected' | 'error' | 'unconfigured';

interface StatusDetail {
  status: Status;
  message?: string;
}

interface StatusIndicatorProps {
  status: {
    sheets: StatusDetail;
    gemini: StatusDetail;
  };
}

const StatusDot: React.FC<{ status: Status }> = ({ status }) => {
  const baseClasses = 'w-2.5 h-2.5 rounded-full transition-colors';
  let colorClass = 'bg-slate-400'; // checking
  if (status === 'connected') colorClass = 'bg-green-500';
  if (status === 'error' || status === 'unconfigured') colorClass = 'bg-red-500';
  
  return <div className={`${baseClasses} ${colorClass}`}></div>;
};


const StatusItem: React.FC<{ name: string, statusDetail: StatusDetail }> = ({ name, statusDetail }) => {
  const statusTextMap: Record<Status, string> = {
    checking: 'Memeriksa...',
    connected: 'Terhubung',
    error: 'Gagal',
    unconfigured: 'Belum Dikonfigurasi',
  };
  
  return (
     <div className="flex items-center gap-2 text-xs" title={statusDetail.message}>
      <StatusDot status={statusDetail.status} />
      <span className="font-medium text-slate-600">{name}:</span>
      <span className="text-slate-500">{statusTextMap[statusDetail.status]}</span>
    </div>
  );
};


const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  return (
    <div className="flex justify-center items-center gap-4 mt-2">
        <StatusItem name="Google Sheets" statusDetail={status.sheets} />
        <StatusItem name="Gemini API" statusDetail={status.gemini} />
    </div>
  );
};

export default StatusIndicator;
