import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './AppTest';
import * as serviceWorker from './serviceWorker';

import SignalProtocol from './protocol'

async function main() {
  const protocol = new SignalProtocol();
  const store =await protocol.createRegistrationId('test','test11',222);
  console.log("生成的个人信息",store);
}

// main();


createRoot( document.getElementById('root')!).render(
  <React.StrictMode> 
    <App />
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
