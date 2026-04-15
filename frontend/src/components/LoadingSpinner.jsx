import { useTheme } from '../context/ThemeContext';

export default function LoadingSpinner({ className = '' }) {
  const { c } = useTheme();
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        style={{
          width: 24, height: 24,
          borderRadius: '50%',
          border: `2.5px solid ${c.borderSubtle}`,
          borderTopColor: c.blue,
          animation: 'spin 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
