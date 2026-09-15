import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  danger: AlertTriangle,
  info: Info,
};

/** 轻提示视口（由 ToastProvider 渲染，页面无需直接使用） */
export function ToastViewport({ toasts = [], onDismiss }) {
  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.variant] || Info;
          return (
            <motion.div
              key={t.id}
              layout
              className={`toast toast--${t.variant}`}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 26, scale: 0.96 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => onDismiss(t.id)}
            >
              <Icon className="toast__icon" size={18} strokeWidth={1.75} />
              <div className="grow">
                <div className="toast__title">{t.title}</div>
                {t.desc ? <div className="toast__desc">{t.desc}</div> : null}
              </div>
              <motion.span
                className="toast__bar"
                style={{ width: '100%' }}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: (t.duration || 3400) / 1000, ease: 'linear' }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
