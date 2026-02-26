import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter, createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './routes/__root'
import { Route as indexRoute } from './routes/index'
import { Route as configRoute } from './routes/configuration'

import './index.css'
import './i18n/config'

// Build the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  configRoute,
])

// Create a new router instance
const router = createRouter({ routeTree })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
