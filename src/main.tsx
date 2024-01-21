import { createRoot } from 'react-dom/client'
import './index.css'
// import App from './App'
import React from 'react'

// import { run } from './test'
import {  run } from './crypto'

run()

createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		{/* <App /> */}
	</React.StrictMode>
)
