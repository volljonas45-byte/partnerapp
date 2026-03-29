import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { timeApi } from '../api/time';

function fmtElapsed(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// size: 'normal' | 'small'
export default function ProjectTimerButton({ projectId, projectName, size = 'normal' }) {
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);

  const { data: activeTimer } = useQuery({
    queryKey: ['active-timer'],
    queryFn: timeApi.timerActive,
    refetchInterval: 8000,
  });

  const isRunning = activeTimer?.project_id === projectId;

  // Live 1s tick when this project's timer is active
  useEffect(() => {
    if (!isRunning || !activeTimer?.start_time) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(activeTimer.start_time)) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isRunning, activeTimer?.start_time]);

  const startMutation = useMutation({
    mutationFn: () => timeApi.timerStart({ project_id: projectId, description: '' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-timer'] });
      qc.invalidateQueries({ queryKey: ['time-summary'] });
      toast.success(`Timer gestartet`);
    },
    onError: () => toast.error('Timer konnte nicht gestartet werden'),
  });

  const stopMutation = useMutation({
    mutationFn: () => timeApi.timerStop(activeTimer.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-timer'] });
      qc.invalidateQueries({ queryKey: ['time-summary'] });
      toast.success('Timer gestoppt');
    },
    onError: () => toast.error('Timer konnte nicht gestoppt werden'),
  });

  const sm = size === 'small';

  if (isRunning) {
    return (
      <button
        onClick={e => { e.stopPropagation(); stopMutation.mutate(); }}
        title="Timer stoppen"
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: sm ? '4px 9px' : '5px 11px',
          borderRadius: '99px',
          background: 'rgba(255,59,48,0.09)',
          border: '1.5px solid rgba(255,59,48,0.22)',
          color: '#FF3B30',
          fontSize: sm ? '11px' : '12px',
          fontWeight: '600',
          cursor: 'pointer',
          letterSpacing: '-0.01em',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,48,0.16)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,59,48,0.09)'}
      >
        <Square size={sm ? 9 : 10} fill="#FF3B30" strokeWidth={0} />
        {fmtElapsed(elapsed)}
      </button>
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); startMutation.mutate(); }}
      title={`Timer starten: ${projectName}`}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: sm ? '26px' : '30px',
        height: sm ? '26px' : '30px',
        borderRadius: '50%',
        background: 'transparent',
        border: '1.5px solid rgba(0,0,0,0.13)',
        color: '#A0A0A8',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(0,113,227,0.08)';
        e.currentTarget.style.borderColor = '#0071E3';
        e.currentTarget.style.color = '#0071E3';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.13)';
        e.currentTarget.style.color = '#A0A0A8';
      }}
    >
      <Play size={sm ? 9 : 11} fill="currentColor" strokeWidth={0} style={{ marginLeft: '1px' }} />
    </button>
  );
}
