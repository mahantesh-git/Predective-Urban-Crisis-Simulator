

export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentage(num: number, decimals: number = 0): string {
  return `${(num * 100).toFixed(decimals)}%`;
}

export function getCrisisColor(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return '#EF4444'; 
    case 'HIGH':
      return '#F97316'; 
    case 'MODERATE':
      return '#EAB308'; 
    case 'LOW':
    case 'SAFE':
      return '#22C55E'; 
    default:
      return '#64748b'; 
  }
}

export function getCrisisColorClass(level: string, type: 'bg' | 'text' | 'border' = 'bg'): string {
  const prefix = type === 'bg' ? 'bg-' : type === 'text' ? 'text-' : 'border-';
  
  switch (level) {
    case 'CRITICAL':
      return `${prefix}red-500`;
    case 'HIGH':
      return `${prefix}orange-500`;
    case 'MODERATE':
      return `${prefix}yellow-500`;
    case 'LOW':
    case 'SAFE':
      return `${prefix}green-500`;
    default:
      return `${prefix}slate-500`;
  }
}

export function formatTimeAgo(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function formatFutureTime(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export function getAlertIcon(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return '🔴';
    case 'HIGH':
      return '🟠';
    case 'MODERATE':
      return '🟡';
    case 'LOW':
    case 'SAFE':
      return '🟢';
    default:
      return '⚪';
  }
}
