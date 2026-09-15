/* ============================================================================
   lib/publish.js —— 「发布」这个动作的客户端

   浏览器不能直接把文件写进项目目录，所以这一请求交给本地 dev server 上
   由 vite.config.js 注册的 /__studio/publish 中间件代劳，它会把 markdown
   写进 src/content/posts/。

   返回结构统一为：
     { ok: true,  path, overwritten, message }
     { ok: false, reason: 'unavailable' | 'rejected', message }
   reason 用来区分两种失败：
     · unavailable —— 接口根本不存在（打开了构建产物、或没跑 dev server）
     · rejected    —— 接口在，但拒绝了这次写入（文件名为空、越界、磁盘错误…）
   ============================================================================ */

const ENDPOINT = '/__studio/publish';

/**
 * 把一篇 markdown 写到本地内容目录
 * @param {{ fileName: string, markdown: string }} payload
 */
export async function publishToDisk({ fileName, markdown }) {
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, markdown }),
    });
  } catch (err) {
    return { ok: false, reason: 'unavailable', message: err?.message || '网络请求失败' };
  }

  // 接口不存在时，dev/preview server 会把 /__studio/publish 当成前端路由，
  // 回一份 index.html（200 + text/html）。用 content-type 就能识别出这种情况，
  // 否则会在 JSON.parse 处抛出一个跟真实原因无关的错。
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return {
      ok: false,
      reason: 'unavailable',
      message: '发布接口不可用（当前不是开发服务器）',
    };
  }

  try {
    const data = await res.json();
    if (!data || data.ok !== true) {
      return {
        ok: false,
        reason: 'rejected',
        message: data?.message || `写入被拒绝（HTTP ${res.status}）`,
      };
    }
    return data;
  } catch {
    return { ok: false, reason: 'rejected', message: '发布接口返回了无法解析的内容' };
  }
}
