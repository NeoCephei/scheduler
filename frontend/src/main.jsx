import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter, createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './routes/__root'
import { Route as indexRoute } from './routes/index'
import { Route as configRoute } from './routes/configuration'
import { Route as staffRoute } from './routes/staff'
import { Route as staffDetailRoute } from './routes/staff.$workerId'
import { Route as absencesRoute } from './routes/absences'

import './index.css'
import './i18n/config'

// Build the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  configRoute,
  staffRoute,
  staffDetailRoute,
  absencesRoute,
])

// Create a new router instance
const router = createRouter({ routeTree })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
