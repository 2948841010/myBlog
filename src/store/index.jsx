import { ThemeProvider } from './theme.jsx';
import { ToastProvider } from './toast.jsx';
import { UIProvider } from './ui.jsx';

export { ThemeProvider, useTheme } from './theme.jsx';
export { ToastProvider, useToast } from './toast.jsx';
export { UIProvider, useUI } from './ui.jsx';

/** 应用级 Provider 组合（顺序：主题 → 提示 → UI） */
export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <UIProvider>{children}</UIProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
