import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: 'var(--success)',
  error: 'var(--error)',
  info: 'var(--accent)',
  warning: 'var(--warning)',
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div key={toast.id} className="toast-item">
            <Icon size={15} color={colorMap[toast.type]} />
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              className="btn-icon"
              onClick={() => removeToast(toast.id)}
              style={{ padding: 2 }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
