import { useEffect, useRef, useState } from 'react';

/**
 * 极简异步数据 hook（加载态 / 错误态 / 数据）
 * 页面统一用它消费 src/api 里的 stub，保证 loading 与 empty 状态可渲染。
 */
export function useAsync(fn, deps = [], initial = null) {
  const [state, setState] = useState({ data: initial, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));

    Promise.resolve(fnRef.current())
      .then((res) => {
        if (alive) setState({ data: res, loading: false, error: null });
      })
      .catch((err) => {
        if (alive) setState({ data: initial, loading: false, error: err });
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

export default useAsync;
