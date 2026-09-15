import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 写作台发布接口 —— 只在开发服务器上存在（apply: 'serve'）。
 *
 * 为什么需要它：浏览器没法直接把文件写进项目目录，所以「发布」这个动作
 * 交给本地 dev server 代劳。它把收到的 markdown 写进 src/content/posts/，
 * Vite 的文件监听随即触发重新加载，页面就能立刻看到新文章。
 *
 * 生产构建里这段代码不会被打包，线上也不存在这个接口 ——
 * 也就是说线上没有任何「写入」入口，安全性来自「没有这个功能」而不是权限校验。
 */
function studioPublish() {
  const CONTENT_DIR = 'src/content/posts';
  const ENDPOINT = '/__studio/publish';

  return {
    name: 'studio-publish',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith(ENDPOINT)) return next();

        const reply = (status, payload) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(payload));
        };

        if (req.method !== 'POST') {
          return reply(405, { ok: false, message: '只接受 POST' });
        }

        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          let body;
          try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch {
            return reply(400, { ok: false, message: '请求体不是合法 JSON' });
          }

          const markdown = String(body.markdown || '');
          if (!markdown.trim()) {
            return reply(400, { ok: false, message: '内容为空，没东西可写' });
          }

          // 文件名必须是「裸文件名」：不含路径分隔符，也不是 . / ..
          // 这里选择直接拒绝，而不是截取 basename —— 悄悄改名会让调用方以为
          // 写到了 A、实际落在 B，出问题时极难排查。宁可报错。
          const raw = String(body.fileName || '').trim();
          if (
            !raw ||
            raw.includes('/') ||
            raw.includes('\\') ||
            raw === '.' ||
            raw === '..'
          ) {
            return reply(400, { ok: false, message: '文件名不合法：只允许裸文件名' });
          }
          const fileName = raw.endsWith('.md') ? raw : `${raw}.md`;

          const dir = path.resolve(server.config.root, CONTENT_DIR);
          const target = path.join(dir, fileName);
          // 双保险：即便上面漏了，也不允许写到内容目录之外
          if (!target.startsWith(dir + path.sep)) {
            return reply(400, { ok: false, message: '目标路径越界' });
          }

          try {
            fs.mkdirSync(dir, { recursive: true });
            const existed = fs.existsSync(target);
            fs.writeFileSync(target, markdown, 'utf8');
            return reply(200, {
              ok: true,
              overwritten: existed,
              path: `${CONTENT_DIR}/${fileName}`,
              message: existed ? '已覆盖同名文件' : '已写入新文件',
            });
          } catch (err) {
            return reply(500, { ok: false, message: `写入失败：${err.message}` });
          }
        });
      });
    },
  };
}

// base 使用相对路径，保证 dist/ 直接双击或托管在任意静态空间都能打开
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  /*
   * 写作台开关在构建期注入成字面量 true / false。
   *
   * 为什么不直接写 `import.meta.env.VITE_ENABLE_STUDIO === 'on'`：
   * 那样得到的是「对 env 对象取属性再比较」，Rollup 无法确定它是不是常量，
   * 于是 App.jsx 里那个三元表达式不会被折叠，动态 import 会活下来，
   * 写作台的 chunk 依然会被产出（虽然不会被加载）。走 define 注入一个字面量，
   * 三元表达式就能在打包期彻底消除，关闭时连 chunk 都不会生成。
   */
  const studioEnabled = env.VITE_ENABLE_STUDIO === 'on';

  return {
    base: './',
    define: {
      __STUDIO_ENABLED__: JSON.stringify(studioEnabled),
    },
    plugins: [react(), studioPublish()],
    server: {
      port: 5173,
      open: false,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      chunkSizeWarningLimit: 1200,
    },
  };
});
