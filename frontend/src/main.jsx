import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter, createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './routes/__root'
import { Route as indexRoute } from './routes/index'
import { Route as configRoute } from './routes/configuration'
import { Route as staffRoute } from './routes/staff'
import { Route as staffDetailRoute } from './routes/staff.$workerId'
import { Route as absRoute } from './routes/absences'
import { Route as calendarRoute } from './routes/calendar'
import { Route as traineesRoute } from './routes/trainees'
import { Route as traineeDetailRoute } from './routes/trainees.$traineeId'
import { Route as supportRoute } from './routes/support'

import './index.css'
import './i18n/config'

// Build the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  calendarRoute,
  configRoute,
  staffRoute,
  staffDetailRoute,
  absRoute,
  traineesRoute,
  traineeDetailRoute,
  supportRoute,
])

// Create a new router instance
const router = createRouter({ routeTree })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
