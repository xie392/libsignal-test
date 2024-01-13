import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

import * as serviceWorker from './serviceWorker'
import React from 'react'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 如果您希望您的应用程序能够离线工作并更快加载，您可以更改
// 下面的 unregister() 到 register() 。请注意，这会带来一些陷阱。
// 了解有关服务人员的更多信息：https://bit.ly/CRA-PWA
serviceWorker.unregister()
