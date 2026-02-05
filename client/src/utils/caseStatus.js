// Case Status Definitions and Utilities
export const CASE_STATUSES = {
  intake: {
    label: 'Intake',
    description: 'Initial consultation and information gathering',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300',
    icon: '📋',
    nextStatuses: ['confirmed', 'cancelled']
  },
  confirmed: {
    label: 'Confirmed',
    description: 'Details confirmed, payment arranged, ready for preparation',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    icon: '✅',
    nextStatuses: ['preparation', 'cancelled']
  },
  preparation: {
    label: 'In Preparation',
    description: 'Preparing coffin, tent, and other arrangements',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
    icon: '🔧',
    nextStatuses: ['scheduled', 'confirmed']
  },
  scheduled: {
    label: 'Scheduled',
    description: 'All preparations complete, funeral date confirmed',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300',
    icon: '📅',
    nextStatuses: ['in_progress', 'preparation']
  },
  in_progress: {
    label: 'In Progress',
    description: 'Funeral service is currently happening',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
    icon: '🚗',
    nextStatuses: ['completed']
  },
  completed: {
    label: 'Completed',
    description: 'Funeral service completed successfully',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    icon: '✓',
    nextStatuses: ['archived']
  },
  archived: {
    label: 'Archived',
    description: 'Case closed, all follow-up completed',
    color: 'slate',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-300',
    icon: '📦',
    nextStatuses: []
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Case was cancelled',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    icon: '❌',
    nextStatuses: []
  }
};

/**
 * Get status configuration
 */
export const getStatusConfig = (status) => {
  return CASE_STATUSES[status] || CASE_STATUSES.intake;
};

/**
 * Get next possible statuses for a given status
 */
export const getNextStatuses = (currentStatus) => {
  const config = getStatusConfig(currentStatus);
  return config.nextStatuses.map(status => ({
    value: status,
    ...getStatusConfig(status)
  }));
};

/**
 * Suggest status based on funeral date
 */
export const suggestStatus = (funeralDate, currentStatus) => {
  if (!funeralDate) return currentStatus;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const funeral = new Date(funeralDate);
  funeral.setHours(0, 0, 0, 0);
  
  const daysUntilFuneral = Math.floor((funeral - today) / (1000 * 60 * 60 * 24));
  
  // If funeral is today and status is scheduled, suggest in_progress
  if (daysUntilFuneral === 0 && currentStatus === 'scheduled') {
    return 'in_progress';
  }
  
  // If funeral was yesterday or earlier and status is in_progress, suggest completed
  if (daysUntilFuneral < 0 && currentStatus === 'in_progress') {
    return 'completed';
  }
  
  // If funeral is more than 7 days ago and status is completed, suggest archived
  if (daysUntilFuneral < -7 && currentStatus === 'completed') {
    return 'archived';
  }
  
  // If funeral is within 2 days and status is confirmed, suggest preparation
  if (daysUntilFuneral <= 2 && daysUntilFuneral >= 0 && currentStatus === 'confirmed') {
    return 'preparation';
  }
  
  // If funeral is within 1 day and status is preparation, suggest scheduled
  if (daysUntilFuneral <= 1 && daysUntilFuneral >= 0 && currentStatus === 'preparation') {
    return 'scheduled';
  }
  
  return currentStatus;
};

/**
 * Get status badge component props
 */
export const getStatusBadgeProps = (status) => {
  const config = getStatusConfig(status);
  return {
    className: `${config.bgColor} ${config.textColor} ${config.borderColor} border px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1`,
    title: config.description
  };
};

