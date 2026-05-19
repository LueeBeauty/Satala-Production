import React from 'react';
import StatusBadge from './StatusBadge';

export default function ComponentRow({ component, onStatusChange }) {
  const progress = component.target_qty > 0
    ? Math.min(100, Math.round((component.current_qty / component.target_qty) * 100))
    : 0;

  const deficit = component.target_qty - (component.current_qty || 0);
  const bgStyle = component.color_code
    ? { backgroundColor: component.color_code + '18', borderLeft: `3px solid ${component.color_code}` }
    : {};

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        component.status === 'ready' ? 'bg-green-50/80' : 'bg-muted/40'
      }`}
      style={component.color_code ? bgStyle : {}}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{component.name}</span>
          <StatusBadge status={component.status} small />
        </div>
        {component.vendor && (
          <span className="text-[11px] text-muted-foreground">{component.vendor}</span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {component.target_qty > 0 && (
          <div className="text-right">
            <div className="text-xs font-medium">
              {component.current_qty || 0}/{component.target_qty}
            </div>
            {deficit > 0 && component.status !== 'ready' && (
              <div className="text-[10px] text-destructive">kurang {deficit}</div>
            )}
          </div>
        )}

        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress >= 100 ? 'bg-green-500' : progress > 0 ? 'bg-yellow-500' : 'bg-gray-300'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {onStatusChange && (
          <div className="flex gap-1">
            {['pending', 'in_progress', 'ready'].map((s) => (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  component.status === s
                    ? s === 'ready' ? 'bg-green-500 border-green-500' :
                      s === 'in_progress' ? 'bg-yellow-500 border-yellow-500' :
                      'bg-gray-400 border-gray-400'
                    : 'border-muted-foreground/30 hover:border-muted-foreground/60'
                }`}
                title={s === 'ready' ? 'Ready' : s === 'in_progress' ? 'In Progress' : 'Pending'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}