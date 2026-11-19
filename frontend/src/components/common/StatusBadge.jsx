import React from 'react';

export default function StatusBadge({ status, level }) {
  const val = (level || status || 'INFO').toUpperCase();

  let className = 'badge badge-info';
  if (val === 'CRITICAL' || val === 'FATAL') className = 'badge badge-critical';
  else if (val === 'ERROR' || val === 'OPEN' || val === 'HIGH') className = 'badge badge-error';
  else if (val === 'WARN' || val === 'WARNING' || val === 'INVESTIGATING' || val === 'MEDIUM') className = 'badge badge-warning';
  else if (val === 'DEBUG') className = 'badge badge-debug';
  else if (val === 'RESOLVED' || val === 'HEALTHY' || val === 'CONNECTED' || val === 'LOW' || val === 'SUCCESS') className = 'badge badge-success';
  else if (val === 'DISCONNECTED') className = 'badge badge-error';

  return (
    <span className={className}>
      {val}
    </span>
  );
}
