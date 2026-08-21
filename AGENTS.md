# Agent notes

- 注意 React 状态不要陷入死循环。不要在 render 或「只读查询」里写入 store / `setState`；`useEffect` 依赖不要用每次渲染都会变的新对象。今日页曾因 `getTodayItems` 每次写快照、effect 又依赖 `app.state`，循环到白屏。
