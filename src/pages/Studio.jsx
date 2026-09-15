import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  FileUp,
  PenLine,
  Plus,
  Rocket,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { ThemeToggle } from '../components/ui/ThemeToggle.jsx';
import { PostEditor } from '../components/studio/PostEditor.jsx';
import { Markdown } from '../lib/markdown.jsx';
import { CodeBlock } from '../components/ui/CodeBlock.jsx';
import {
  FRONTMATTER_ORDER,
  loadFilePosts,
  postFromMarkdown,
  postToFrontmatter,
} from '../lib/content.js';
import { slugify, stringifyFrontmatter } from '../lib/frontmatter.js';
import {
  createDraft,
  draftFileName,
  draftFromPost,
  readDrafts,
  removeDraft,
  saveDraft,
} from '../lib/drafts.js';
import { seriesList } from '../mock/db.js';
import { publishToDisk } from '../lib/publish.js';
import { formatDate } from '../lib/format.js';
import '../styles/studio.css';

/* ============================================================================
   pages/Studio.jsx —— 写作台（#/studio）

   它是全站唯一不进导航的页面：直接改地址栏才会进来，别人从首页点不到。
   路由上也不套 AppShell，所以没有侧边栏、页脚和那些氛围动效 —— 写作时越安静越好。

   数据流向：
     文件（src/content/posts/*.md）＝ 已发布，只读，来自仓库
     草稿（localStorage）        ＝ 本地未发布，随便改，刷新不丢
     「导出 .md」把草稿变成文件 —— 那一刻内容才真正离开浏览器、进到仓库里。
   ============================================================================ */

const AUTOSAVE_MS = 700;

const STATUS_LABEL = {
  published: '已发布',
  draft: '草稿',
  planned: '计划中',
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}

export default function Studio() {
  const filePosts = useMemo(() => loadFilePosts(), []);
  const seriesOptions = useMemo(
    () => seriesList.map((s) => ({ slug: s.slug, title: s.title })),
    []
  );

  const [drafts, setDrafts] = useState(() => readDrafts());
  const [active, setActive] = useState(null);
  const [kind, setKind] = useState(null); // 'draft' | 'file'
  const [saveState, setSaveState] = useState('idle'); // idle | pending | saved
  const [flash, setFlash] = useState('');
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedPath, setPublishedPath] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const activeRef = useRef(null);
  const timer = useRef(null);
  const flashTimer = useRef(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const say = useCallback((msg) => {
    setFlash(msg);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(''), 2800);
  }, []);

  /** 把「待保存」立刻落盘（切换文章、导出前调用） */
  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const cur = activeRef.current;
    if (cur && String(cur.id).startsWith('draft:')) {
      setDrafts(saveDraft(cur));
    }
    setSaveState('idle');
  }, []);

  const patchActive = useCallback(
    (patch) => {
      setActive((prev) => {
        const next = prev ? { ...prev, ...patch } : prev;
        activeRef.current = next;
        return next;
      });
      setSaveState('pending');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const cur = activeRef.current;
        if (cur && String(cur.id).startsWith('draft:')) {
          setDrafts(saveDraft(cur));
          setSaveState('saved');
          window.clearTimeout(flashTimer.current);
          flashTimer.current = window.setTimeout(() => setSaveState('idle'), 2000);
        }
      }, AUTOSAVE_MS);
    },
    []
  );

  /* ------------------------------ 列表操作 ------------------------------ */

  const openDraft = (draft) => {
    flush();
    setActive({ ...draft });
    setKind('draft');
    setCopied(false);
  };

  const openFilePost = (post) => {
    flush();
    setActive({ ...post });
    setKind('file');
    setCopied(false);
  };

  const newDraft = () => {
    flush();
    const draft = createDraft({ publishedAt: todayISO(), updatedAt: todayISO() });
    setDrafts(saveDraft(draft));
    setActive(draft);
    setKind('draft');
    say('已新建草稿，写点什么吧');
  };

  /** 把当前只读的文件文章复制成一份可编辑草稿 */
  const editFileAsDraft = () => {
    if (!active) return;
    const draft = draftFromPost(active);
    setDrafts(saveDraft(draft));
    setActive(draft);
    setKind('draft');
    say('已复制成草稿，导出时会覆盖同名文件');
  };

  const deleteActive = () => {
    if (!active || kind !== 'draft') return;
    if (!window.confirm(`删除草稿「${active.title || '未命名文章'}」？此操作不可撤销。`)) return;
    window.clearTimeout(timer.current);
    setDrafts(removeDraft(active.id));
    setActive(null);
    setKind(null);
    say('草稿已删除');
  };

  /* ------------------------------ 导出 / 导入 ------------------------------ */

  /** 草稿 → markdown 全文 */
  const toMarkdown = useCallback((draft) => {
    const slug = draft.slug || slugify(draft.title) || 'untitled';
    const data = postToFrontmatter({ ...draft, slug });
    if (data.status === 'published' && !data.publishedAt) data.publishedAt = todayISO();
    return stringifyFrontmatter(data, draft.content, FRONTMATTER_ORDER);
  }, []);

  const exportActive = () => {
    if (!active || kind !== 'draft') return;
    flush();
    const slug = active.slug || slugify(active.title) || 'untitled';
    downloadText(draftFileName({ ...active, slug }), toMarkdown(active));
    say('已下载 .md —— 自己放进 src/content/posts/ 再提交');
  };

  /**
   * 发布：把 markdown 交给本地 dev server 写进 src/content/posts/。
   *
   * 「发布」这个名字意味着这篇要出现在站点上，所以状态一并置为 published ——
   * 否则文件虽然写进去了，却会被 status 过滤掉，页面上什么也看不到，
   * 那种「我发了但它不显示」的困惑最难排查。
   */
  const publishActive = async () => {
    if (!active || kind !== 'draft' || publishing) return;
    flush();

    const today = todayISO();
    const next = {
      ...active,
      status: 'published',
      publishedAt: active.publishedAt || today,
      updatedAt: today,
    };
    setActive(next);
    activeRef.current = next;
    setDrafts(saveDraft(next));

    const slug = next.slug || slugify(next.title) || 'untitled';
    const withSlug = { ...next, slug };

    setPublishing(true);
    setPublishedPath('');
    const res = await publishToDisk({
      fileName: draftFileName(withSlug),
      markdown: toMarkdown(withSlug),
    });
    setPublishing(false);

    if (res.ok) {
      setPublishedPath(res.path);
      say(`${res.message} · 回到站点即可看到，记得 git 提交`);
    } else if (res.reason === 'unavailable') {
      say('发布接口不可用：需要 npm run dev 起的开发服务器，可先用「下载 .md」');
    } else {
      say(`发布失败：${res.message}`);
    }
  };

  const copyActive = async () => {
    if (!active || kind !== 'draft') return;
    flush();
    const ok = await copyText(toMarkdown(active));
    if (ok) {
      setCopied(true);
      say('全文已复制到剪贴板');
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      say('复制失败，请改用「导出 .md」');
    }
  };

  const runImport = () => {
    const text = importText.trim();
    if (!text) {
      say('先粘贴 .md 内容');
      return;
    }
    const post = postFromMarkdown(text, '');
    const draft = createDraft({
      slug: post.slug,
      title: post.title === '未命名' ? '' : post.title,
      dek: post.dek,
      tags: post.tags,
      seriesId: post.seriesId,
      seriesOrder: post.seriesOrder,
      status: post.status,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      featured: post.featured,
      cover: post.cover,
      content: post.content,
    });
    setDrafts(saveDraft(draft));
    setActive(draft);
    setKind('draft');
    setImportText('');
    setImportOpen(false);
    say('已导入为草稿');
  };

  /* ------------------------------ 渲染 ------------------------------ */

  const saveLabel =
    saveState === 'pending' ? '保存中…' : saveState === 'saved' ? '已自动保存' : '';

  return (
    <div className="studio">
      <header className="studio__bar">
        <div className="studio__brand">
          <span className="studio__mark" aria-hidden="true">
            <PenLine size={17} strokeWidth={1.75} />
          </span>
          <div className="studio__brand-text">
            <strong>写作台</strong>
            <span>
              草稿 {drafts.length} · 文件文章 {filePosts.length}
            </span>
          </div>
        </div>

        <div className="studio__bar-mid">
          {flash ? <span className="studio__flash">{flash}</span> : null}
          {!flash && saveLabel ? <span className="studio__flash">{saveLabel}</span> : null}
        </div>

        <div className="studio__bar-actions">
          <ThemeToggle size="sm" />
          <Button size="sm" variant="ghost" icon={FileUp} onClick={() => setImportOpen((v) => !v)}>
            导入 .md
          </Button>
          <Button size="sm" icon={Plus} onClick={newDraft}>
            新建
          </Button>
          <Link className="studio__back" to="/">
            <ArrowLeft size={15} strokeWidth={1.75} aria-hidden="true" />
            回站点
          </Link>
        </div>
      </header>

      {importOpen ? (
        <section className="studio__import">
          <div className="studio__import-head">
            <strong>粘贴 .md 内容</strong>
            <span>把整篇（含 --- frontmatter ---）粘进来，会解析成一篇草稿</span>
          </div>
          <textarea
            className="studio__import-box"
            value={importText}
            placeholder={'---\ntitle: 标题\nslug: my-post\n---\n\n## 正文'}
            spellCheck="false"
            onChange={(e) => setImportText(e.target.value)}
          />
          <div className="studio__import-actions">
            <Button size="sm" onClick={runImport}>
              解析并新建草稿
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setImportOpen(false)}>
              取消
            </Button>
          </div>
        </section>
      ) : null}

      <div className="studio__body">
        <aside className="studio__list" aria-label="文章列表">
          <div className="studio__group">
            <div className="studio__group-head">
              <span>本地草稿</span>
              <em>{drafts.length}</em>
            </div>
            {drafts.length ? (
              drafts.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`studio__item${active?.id === d.id && kind === 'draft' ? ' is-active' : ''}`}
                  onClick={() => openDraft(d)}
                >
                  <span className="studio__item-title">{d.title || '未命名文章'}</span>
                  <span className="studio__item-sub">
                    {STATUS_LABEL[d.status] || d.status} · {(d.content || '').length} 字符
                  </span>
                </button>
              ))
            ) : (
              <p className="studio__list-hint">还没有草稿，点右上角「新建」</p>
            )}
          </div>

          <div className="studio__group">
            <div className="studio__group-head">
              <span>来自文件</span>
              <em>{filePosts.length}</em>
            </div>
            {filePosts.length ? (
              filePosts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`studio__item${active?.id === p.id && kind === 'file' ? ' is-active' : ''}`}
                  onClick={() => openFilePost(p)}
                >
                  <span className="studio__item-title">{p.title || p.slug}</span>
                  <span className="studio__item-sub">
                    {p.publishedAt ? formatDate(p.publishedAt) : '无日期'} · 只读
                  </span>
                </button>
              ))
            ) : (
              <p className="studio__list-hint">
                内容目录还是空的。导出草稿后放进 <code>src/content/posts/</code>，这里就会出现。
              </p>
            )}
          </div>
        </aside>

        <main className="studio__main">
          {kind === 'draft' && active ? (
            <>
              <div className="studio__main-bar">
                <span className="studio__main-path">
                  {active.slug ? `/posts/${active.slug}` : '未设置 slug'}
                </span>
                <div className="studio__main-actions">
                  <Button
                    size="sm"
                    icon={Rocket}
                    onClick={publishActive}
                    disabled={publishing}
                  >
                    {publishing ? '发布中…' : '发布'}
                  </Button>
                  <Button size="sm" variant="ghost" icon={Download} onClick={exportActive}>
                    下载 .md
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={copied ? Check : Copy}
                    onClick={copyActive}
                  >
                    {copied ? '已复制' : '复制全文'}
                  </Button>
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={deleteActive}>
                    删除
                  </Button>
                </div>
              </div>

              {publishedPath ? (
                <p className="studio__published">
                  已写入 <code>{publishedPath}</code> ——
                  下一步只需 <code>git add . &amp;&amp; git commit -m "post" &amp;&amp; git push</code>，
                  部署平台会自动构建上线。
                </p>
              ) : null}
              <PostEditor draft={active} onChange={patchActive} seriesList={seriesOptions} />
            </>
          ) : null}

          {kind === 'file' && active ? (
            <article className="studio__file">
              <div className="studio__file-head">
                <span className="studio__badge">
                  <FileText size={13} strokeWidth={1.75} aria-hidden="true" />
                  来自文件 · 只读
                </span>
                <h1>{active.title}</h1>
                {active.dek ? <p className="studio__file-dek">{active.dek}</p> : null}
                <div className="studio__file-meta">
                  <span>{active.publishedAt ? formatDate(active.publishedAt) : '无日期'}</span>
                  <span>
                    {STATUS_LABEL[active.status] || active.status}
                  </span>
                  {active.tags?.length ? <span>{active.tags.join(' · ')}</span> : null}
                </div>
                <Button size="sm" icon={PenLine} onClick={editFileAsDraft}>
                  在本地编辑这篇
                </Button>
              </div>
              <div className="studio__file-body">
                <Markdown content={active.content} codeComponent={CodeBlock} />
              </div>
            </article>
          ) : null}

          {!active ? (
            <div className="studio__welcome">
              <h1>这里只有你能看到</h1>
              <p>
                写作台的地址是 <code>#/studio</code>，没有加进导航栏，从站点首页也点不到。
                别人访问你的博客时，看到的仍然是原来的页面。
              </p>
              <ol className="studio__steps">
                <li>
                  <strong>写</strong>：点「新建」，填标题正文。改动会自动存进浏览器，刷新不丢。
                </li>
                <li>
                  <strong>发布</strong>：点「发布」，markdown 会由本地 dev server 直接写进{' '}
                  <code>src/content/posts/</code>，页面随即热更新，你立刻能在站点上看到成品。
                </li>
                <li>
                  <strong>上线</strong>：自己 <code>git add</code> / <code>commit</code> /{' '}
                  <code>push</code>，部署平台自动构建，读者就能看到了。
                </li>
              </ol>
              <p className="studio__welcome-note">
                注意两点：草稿存在浏览器 localStorage 里，换设备或清缓存会丢，所以写完及时「发布」；
                「发布」只在 <code>npm run dev</code> 起的开发服务器上可用，「下载 .md」是不依赖它的兜底路径。
              </p>
              <Button icon={Plus} onClick={newDraft}>
                新建第一篇
              </Button>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
