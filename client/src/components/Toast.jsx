import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let Icon = Info;
        let toastClass = 'toast toast-info';
        if (toast.type === 'success') {
          Icon = CheckCircle2;
          toastClass = 'toast toast-success';
        } else if (toast.type === 'error') {
          Icon = XCircle;
          toastClass = 'toast toast-error';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          toastClass = 'toast toast-warning';
        }

        return (
          <div key={toast.id} className={toastClass}>
            <Icon size={18} />
            <div style={{ flex: 1, fontSize: '0.82rem', lineHeight: 1.3 }}>
              {toast.message}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
