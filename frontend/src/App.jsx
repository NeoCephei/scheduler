import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [healthStatus, setHealthStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const checkHealth = async () => {
    setLoading(true)
    try {
      const response = await axios.get('http://localhost:3001/api/health')
      setHealthStatus(response.data)
    } catch (error) {
      console.error('Health check failed:', error)
      setHealthStatus({ status: 'error', message: 'Could not connect to backend' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Scheduler Desktop</h1>
      <p className="subtitle">Welcome to your new desktop application</p>
      
      <div className="card">
        <button onClick={checkHealth} disabled={loading}>
          {loading ? 'Checking...' : 'Check Backend Health'}
        </button>
        
        {healthStatus && (
          <div className={`status-box ${healthStatus.status}`}>
            <h3>Status: {healthStatus.status.toUpperCase()}</h3>
            <p>{healthStatus.message}</p>
          </div>
        )}
      </div>

      <p className="read-the-docs">
        React + Electron + Node.js + MySQL
      </p>
    </div>
  )
}

export default App
