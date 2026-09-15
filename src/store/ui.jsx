import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const UIContext = createContext(null);

/** 全局 UI 状态：命令面板（⌘K）与移动端抽屉 */
export function UIProvider({ children }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openPalette = useCallback(() => {
    setPaletteOpen(true);
    setDrawerOpen(false);
  }, []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // ⌘K / Ctrl+K 打开命令面板；Esc 关闭
  useEffect(() => {
    const onKeyDown = (e) => {
      const isK = e.key === 'k' || e.key === 'K';
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      paletteOpen,
      openPalette,
      closePalette,
      drawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [paletteOpen, openPalette, closePalette, drawerOpen, openDrawer, closeDrawer]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI 必须在 UIProvider 内部使用');
  return ctx;
}
