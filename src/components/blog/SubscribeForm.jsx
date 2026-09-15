import { useState } from 'react';
import { Send, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Field, Input } from '../ui/Form.jsx';
import { subscribe } from '../../api/index.js';
import { useToast } from '../../store/index.jsx';

/** 订阅表单：本地校验 + 异步提交 + loading / 成功态 + 全局 toast */
export function SubscribeForm({ hint = '每两周一封，只写 Agent 工程实践，随时退订。' }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { push } = useToast();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('请填写邮箱地址');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('邮箱格式看起来不太对');
      return;
    }

    setLoading(true);
    const res = await subscribe(email.trim());
    setLoading(false);

    if (res.code !== 0) {
      setError(res.message);
      push({ variant: 'danger', title: '订阅失败', desc: res.message });
      return;
    }

    setDone(true);
    push({ variant: 'success', title: '订阅成功', desc: res.message });
  };

  if (done) {
    return (
      <div className="panel panel--glow row" style={{ gap: 14, alignItems: 'center' }}>
        <CheckCircle2 size={20} strokeWidth={1.75} className="text-accent" aria-hidden="true" />
        <span className="stack stack--2">
          <span style={{ fontWeight: 600 }}>已加入订阅列表</span>
          <span className="text-sub" style={{ fontSize: 13 }}>
            {email} 会收到下一篇连载的更新提醒。
          </span>
        </span>
      </div>
    );
  }

  return (
    <form className="stack stack--3" onSubmit={onSubmit} noValidate>
      <Field label="订阅连载更新" htmlFor="subscribe-email" error={error} hint={hint}>
        <div className="input-group">
          <Input
            id="subscribe-email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={email}
            error={Boolean(error)}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            aria-invalid={Boolean(error)}
            autoComplete="email"
          />
          <Button
            type="submit"
            variant="primary"
            icon={loading ? undefined : Send}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                提交中
              </>
            ) : (
              '订阅'
            )}
          </Button>
        </div>
      </Field>
      <span className="row" style={{ gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
        <Mail size={13} strokeWidth={1.75} aria-hidden="true" />
        前端演示：提交不会真的写入任何服务端。
      </span>
    </form>
  );
}
