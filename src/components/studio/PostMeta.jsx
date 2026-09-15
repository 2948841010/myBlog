import { useEffect, useState } from 'react';
import { Field, Input, Textarea } from '../ui/Form.jsx';
import { CoverArt } from '../blog/PostCard.jsx';
import { COVER_PATTERNS, POST_STATUSES } from '../../lib/content.js';

/* ============================================================================
   components/studio/PostMeta.jsx —— 文章元数据表单
   只负责「frontmatter 那一部分」的编辑；正文交给 PostEditor。
   ============================================================================ */

const STATUS_LABEL = {
  published: '已发布',
  draft: '草稿',
  planned: '计划中',
};

const PATTERN_LABEL = {
  grid: '网格',
  dots: '点阵',
  lines: '斜线',
  cross: '十字',
};

/** Date 或 ISO 字符串 → input[type=date] 需要的 yyyy-mm-dd */
function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function PostMeta({ draft, onChange, seriesList = [] }) {
  // 标签用逗号分隔的输入框。若直接回写数组，用户敲的「a, 」会在回车前被吞掉，
  // 所以这里保留一份原始文本，仅在切换文章时与数据同步。
  const [tagsText, setTagsText] = useState((draft.tags || []).join(', '));

  useEffect(() => {
    setTagsText((draft.tags || []).join(', '));
  }, [draft.id]);

  const handleTags = (value) => {
    setTagsText(value);
    onChange({
      tags: value
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  const set = (patch) => onChange(patch);

  return (
    <div className="smeta">
      <div className="smeta__grid">
        <Field
          label="网址 slug"
          htmlFor="meta-slug"
          hint={draft.slug ? `/posts/${draft.slug}` : '留空则导出时用文件名兜底'}
        >
          <Input
            id="meta-slug"
            value={draft.slug}
            placeholder="my-first-post"
            onChange={(e) => set({ slug: e.target.value.replace(/\s+/g, '-') })}
          />
        </Field>

        <Field label="状态" htmlFor="meta-status">
          <select
            id="meta-status"
            className="select"
            value={draft.status}
            onChange={(e) => set({ status: e.target.value })}
          >
            {POST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="所属连载" htmlFor="meta-series">
          <select
            id="meta-series"
            className="select"
            value={draft.seriesId || ''}
            onChange={(e) => set({ seriesId: e.target.value || null })}
          >
            <option value="">不属于任何连载</option>
            {seriesList.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="系列内序号"
          htmlFor="meta-order"
          hint={draft.seriesId ? '决定在连载里的阅读顺序' : '先选连载再填'}
        >
          <Input
            id="meta-order"
            type="number"
            min="0"
            value={draft.seriesOrder || 0}
            disabled={!draft.seriesId}
            onChange={(e) => set({ seriesOrder: Number(e.target.value) || 0 })}
          />
        </Field>

        <Field label="发布日期" htmlFor="meta-published">
          <Input
            id="meta-published"
            type="date"
            value={toDateInput(draft.publishedAt)}
            onChange={(e) => set({ publishedAt: e.target.value || null })}
          />
        </Field>

        <Field label="更新日期" htmlFor="meta-updated">
          <Input
            id="meta-updated"
            type="date"
            value={toDateInput(draft.updatedAt)}
            onChange={(e) => set({ updatedAt: e.target.value || null })}
          />
        </Field>
      </div>

      <Field
        label="摘要 dek"
        htmlFor="meta-dek"
        hint="一句话说清这篇在讲什么，会出现在列表页和详情页导语"
      >
        <Textarea
          id="meta-dek"
          rows={2}
          value={draft.dek}
          placeholder="例如：工具调用失败时到底该重试还是该换路径，我试了三种策略。"
          onChange={(e) => set({ dek: e.target.value })}
        />
      </Field>

      <Field
        label="标签"
        htmlFor="meta-tags"
        hint="用逗号分隔，中文逗号也行。标签云与筛选会跟着自动更新"
      >
        <Input
          id="meta-tags"
          value={tagsText}
          placeholder="ReAct, 工具调用, 踩坑"
          onChange={(e) => handleTags(e.target.value)}
        />
      </Field>

      <div className="smeta__cover">
        <div className="smeta__cover-fields">
          <Field label="封面起始色" htmlFor="meta-from">
            <input
              id="meta-from"
              className="colorwell"
              type="color"
              value={draft.cover?.from || '#FF4D2E'}
              onChange={(e) => set({ cover: { ...draft.cover, from: e.target.value } })}
            />
          </Field>
          <Field label="封面结束色" htmlFor="meta-to">
            <input
              id="meta-to"
              className="colorwell"
              type="color"
              value={draft.cover?.to || '#8C2109'}
              onChange={(e) => set({ cover: { ...draft.cover, to: e.target.value } })}
            />
          </Field>
          <Field label="纹理" htmlFor="meta-pattern">
            <select
              id="meta-pattern"
              className="select"
              value={draft.cover?.pattern || 'grid'}
              onChange={(e) => set({ cover: { ...draft.cover, pattern: e.target.value } })}
            >
              {COVER_PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {PATTERN_LABEL[p] || p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="smeta__preview" aria-hidden="true">
          {/* 复用列表卡同一套封面组件，所以这里看到的就是发出去的样子 */}
          <CoverArt cover={draft.cover} className="smeta__swatch" />
          <span className="smeta__preview-label">列表卡封面</span>
        </div>
      </div>

      <label className="smeta__check">
        <input
          type="checkbox"
          checked={draft.featured === true}
          onChange={(e) => set({ featured: e.target.checked })}
        />
        <span>
          推荐到首页「编辑精选」
          <em>只有已发布且勾选的才会出现在首页大卡位</em>
        </span>
      </label>
    </div>
  );
}
