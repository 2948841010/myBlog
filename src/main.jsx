import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

// 字体走 npm 自托管（@fontsource-variable），不依赖任何 CDN
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/jetbrains-mono';

import './styles/tokens.css';
import './styles/app.css';
import './styles/fx.css';

import App from './App.jsx';
import { AppProviders } from './store/index.jsx';

// 使用 HashRouter：构建产物 dist/ 可直接双击打开或托管在任意静态空间，
// 不需要服务端做 SPA fallback 重写。
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <HashRouter>
        <App />
      </HashRouter>
    </AppProviders>
  </StrictMode>
);
