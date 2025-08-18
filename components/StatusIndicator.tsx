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
  // Teks status dihapus sesuai permintaan, indikator warna sudah cukup.
  // Pesan lengkap tersedia saat hover dari atribut title.
  return (
     <div className="flex items-center gap-2 text-xs" title={statusDetail.message}>
      <StatusDot status={statusDetail.status} />
      <span className="font-medium text-slate-600">{name}</span>
    </div>
  );
};


const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  return (
    <div className="flex flex-col items-end sm:flex-row sm:items-center sm:gap-4">
        <StatusItem name="Data" statusDetail={status.sheets} />
        <StatusItem name="API" statusDetail={status.gemini} />
    </div>
  );
};

export default StatusIndicator;