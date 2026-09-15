import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../store/index.jsx';

/** 明暗主题切换按钮（图标带旋转淡入切换） */
export function ThemeToggle({ size = 'md' }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`btn btn--icon${size === 'sm' ? ' btn--sm' : ''}`}
      onClick={toggle}
      aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
      title={isDark ? '切换到浅色主题' : '切换到深色主题'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -70, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 70, opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'grid', placeItems: 'center' }}
        >
          {isDark ? (
            <Sun size={18} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Moon size={18} strokeWidth={1.75} aria-hidden="true" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
