import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../supabase/client'
import { TABLES } from '../../supabase/tables'
import { useSettings } from '../../context/SettingsContext'

const AUTO_INTERVAL_OPTIONS = [
  { value: 0, label: 'Disabled (Manual Only)' },
  { value: 1, label: 'Every 1 Hour' },
  { value: 6, label: 'Every 6 Hours' },
  { value: 12, label: 'Every 12 Hours (Half Day)' },
  { value: 24, label: 'Every 24 Hours (1 Day)' },
]

export default function BackupSetup() {
  const { reloadSettings } = useSettings()

  // Config State
  const [targetUrl, setTargetUrl] = useState('')
  const [targetKey, setTargetKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [intervalHours, setIntervalHours] = useState(24) // Default 1 day
  const [lastSyncTime, setLastSyncTime] = useState(null)

  // Status & Progress State
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null) // { type: 'success'|'error', msg: string }
  const [savingConfig, setSavingConfig] = useState(false)
  const [configStatus, setConfigStatus] = useState(null)

  // Backup Execution State
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0) // 0 to 100
  const [currentTableSyncing, setCurrentTableSyncing] = useState('')
  const [syncError, setSyncError] = useState('')

  // Logs & Detail Modal State
  const [logs, setLogs] = useState([])
  const [selectedLog, setSelectedLog] = useState(null)
  const [showLogModal, setShowLogModal] = useState(false)

  // Auto Sync Countdown
  const [nextSyncFormatted, setNextSyncFormatted] = useState('N/A')

  const autoSyncTimerRef = useRef(null)

  // 1. Load initial backup configuration and log history on mount
  useEffect(() => {
    loadBackupSettingsAndLogs()
  }, [])

  async function loadBackupSettingsAndLogs() {
    try {
      // Fetch settings from DB
      const { data, error } = await supabase
        .from(TABLES.SETTINGS)
        .select('*')
        .in('key_name', ['backup_config', 'backup_logs'])

      let loadedConfig = null
      let loadedLogs = null

      if (!error && data) {
        const configRow = data.find(r => r.key_name === 'backup_config')
        const logsRow = data.find(r => r.key_name === 'backup_logs')

        if (configRow?.value) {
          try { loadedConfig = JSON.parse(configRow.value) } catch (e) { }
        }
        if (logsRow?.value) {
          try { loadedLogs = JSON.parse(logsRow.value) } catch (e) { }
        }
      }

      // LocalStorage Fallback if DB didn't return
      if (!loadedConfig) {
        const local = localStorage.getItem('strata_backup_config')
        if (local) try { loadedConfig = JSON.parse(local) } catch (e) { }
      }
      if (!loadedLogs) {
        const localL = localStorage.getItem('strata_backup_logs')
        if (localL) try { loadedLogs = JSON.parse(localL) } catch (e) { }
      }

      if (loadedConfig) {
        if (loadedConfig.targetUrl) setTargetUrl(loadedConfig.targetUrl)
        if (loadedConfig.targetKey) setTargetKey(loadedConfig.targetKey)
        if (loadedConfig.intervalHours !== undefined) setIntervalHours(Number(loadedConfig.intervalHours))
        if (loadedConfig.lastSyncTime) setLastSyncTime(loadedConfig.lastSyncTime)
      }

      if (Array.isArray(loadedLogs)) {
        setLogs(loadedLogs)
      }
    } catch (err) {
      console.error('Error loading backup settings:', err)
    }
  }

  // 2. Auto-fetch scheduler background check
  useEffect(() => {
    if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current)

    const checkAutoSync = () => {
      if (!intervalHours || intervalHours <= 0 || !targetUrl || !targetKey || isSyncing) {
        setNextSyncFormatted('Disabled')
        return
      }

      if (!lastSyncTime) {
        setNextSyncFormatted('Pending first sync')
        return
      }

      const intervalMs = intervalHours * 3600 * 1000
      const nextSyncTs = new Date(lastSyncTime).getTime() + intervalMs
      const nowTs = Date.now()
      const diffMs = nextSyncTs - nowTs

      if (diffMs <= 0) {
        setNextSyncFormatted('Triggering Auto Sync...')
        runBackup('Auto-Scheduled', false)
      } else {
        const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60))
        const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        const secsLeft = Math.floor((diffMs % (1000 * 60)) / 1000)
        
        let str = ''
        if (hoursLeft > 0) str += `${hoursLeft}h `
        if (minsLeft > 0 || hoursLeft > 0) str += `${minsLeft}m `
        str += `${secsLeft}s`

        setNextSyncFormatted(`In ${str}`)
      }
    }

    checkAutoSync()
    autoSyncTimerRef.current = setInterval(checkAutoSync, 1000)

    return () => {
      if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current)
    }
  }, [intervalHours, lastSyncTime, targetUrl, targetKey, isSyncing])

  // Save Configuration Handler
  async function handleSaveConfig() {
    setSavingConfig(true)
    setConfigStatus(null)

    try {
      const configObj = {
        targetUrl: targetUrl.trim(),
        targetKey: targetKey.trim(),
        intervalHours: Number(intervalHours),
        lastSyncTime
      }

      // Store in localStorage
      localStorage.setItem('strata_backup_config', JSON.stringify(configObj))

      // Store in Supabase settings
      const { error } = await supabase
        .from(TABLES.SETTINGS)
        .upsert([{ key_name: 'backup_config', value: JSON.stringify(configObj) }])

      if (error) throw error

      if (reloadSettings) reloadSettings()
      setConfigStatus({ type: 'success', msg: 'Backup configuration saved successfully!' })
    } catch (err) {
      setConfigStatus({ type: 'error', msg: err.message || 'Failed to save configuration.' })
    } finally {
      setSavingConfig(false)
    }
  }

  // Test Connection Handler
  async function handleTestConnection() {
    if (!targetUrl || !targetKey) {
      setConnectionStatus({ type: 'error', msg: 'Please provide both Target Supabase URL and Key.' })
      return
    }

    setTestingConnection(true)
    setConnectionStatus(null)

    try {
      const targetClient = createClient(targetUrl.trim(), targetKey.trim())
      // Query a simple select to test validity
      const { data, error } = await targetClient.from(TABLES.SETTINGS).select('key_name').limit(1)

      if (error && error.code !== 'PGRST116') {
        // Even if settings table doesn't exist yet, we check error
        throw error
      }

      setConnectionStatus({ type: 'success', msg: 'Connection successful! Target Supabase is accessible.' })
    } catch (err) {
      setConnectionStatus({ type: 'error', msg: `Connection failed: ${err.message}` })
    } finally {
      setTestingConnection(false)
    }
  }

  // Core Backup Execution Engine (Supports safe append OR full refresh & refill)
  async function runBackup(triggerType = 'Manual', isWipeAndRefill = false) {
    if (!targetUrl || !targetKey) {
      setSyncError('Target Supabase URL and Key are required to start backup.')
      return
    }

    if (isWipeAndRefill) {
      const confirmAction = window.confirm(
        '⚠️ WARNING: Full Refresh & Refill Backup\n\nThis action will WIPE/CLEAR all existing data in the Target Backup Database and refill it with current Live DB data.\n\nAre you sure you want to proceed?'
      )
      if (!confirmAction) return
    }

    setIsSyncing(true)
    setSyncError('')
    setSyncProgress(0)

    const tableList = Object.values(TABLES)
    const tableDetails = []
    let totalRecordsFetched = 0
    let totalRecordsInserted = 0
    let hasFailures = false

    const startTime = new Date().toISOString()
    const targetClient = createClient(targetUrl.trim(), targetKey.trim())

    try {
      for (let i = 0; i < tableList.length; i++) {
        const tbl = tableList[i]
        setCurrentTableSyncing(isWipeAndRefill ? `Clearing & Syncing ${tbl}...` : `Syncing ${tbl}...`)
        setSyncProgress(Math.round(((i) / tableList.length) * 100))

        let fetchedCount = 0
        let status = 'Success'
        let errorMsg = null
        let sampleData = []

        try {
          // If Refresh & Refill requested, clear existing target table data first
          if (isWipeAndRefill) {
            try {
              if (tbl === TABLES.SETTINGS) {
                await targetClient.from(tbl).delete().neq('key_name', '___dummy___')
              } else {
                await targetClient.from(tbl).delete().not('id', 'is', null)
              }
            } catch (wipeErr) {
              console.warn(`Wipe notice for ${tbl}:`, wipeErr)
            }
          }

          // 1. Fetch live data from source DB
          const { data: rows, error: fetchErr } = await supabase
            .from(tbl)
            .select('*')

          if (fetchErr) throw fetchErr

          fetchedCount = rows ? rows.length : 0
          totalRecordsFetched += fetchedCount
          if (rows && rows.length > 0) {
            sampleData = rows.slice(0, 3)
          }

          // 2. Insert/Upsert into target backup DB
          if (fetchedCount > 0) {
            if (isWipeAndRefill) {
              const { error: insertErr } = await targetClient.from(tbl).upsert(rows, { ignoreDuplicates: false })
              if (insertErr) {
                const { error: fbErr } = await targetClient.from(tbl).insert(rows)
                if (fbErr) throw fbErr
              }
            } else {
              // Standard backup: ignoreDuplicates: true preserves existing backup data
              const { error: insertErr } = await targetClient
                .from(tbl)
                .upsert(rows, { ignoreDuplicates: true })

              if (insertErr) {
                const { error: fallbackErr } = await targetClient
                  .from(tbl)
                  .insert(rows, { ignoreDuplicates: true })

                if (fallbackErr) throw fallbackErr
              }
            }
            totalRecordsInserted += fetchedCount
          }
        } catch (err) {
          hasFailures = true
          status = 'Failed'
          errorMsg = err.message || 'Error syncing table'
        }

        tableDetails.push({
          tableName: tbl,
          fetchedCount,
          status,
          errorMsg,
          sampleData
        })
      }

      setSyncProgress(100)
      setCurrentTableSyncing('Completed')

      const endTime = new Date().toISOString()
      const overallStatus = hasFailures ? 'Partial Warning' : 'Success'
      const actualTriggerLabel = isWipeAndRefill ? `${triggerType} (Full Refill)` : triggerType

      // Construct Log Entry
      const newLog = {
        id: 'log_' + Date.now(),
        timestamp: startTime,
        endTime,
        triggerType: actualTriggerLabel,
        overallStatus,
        totalTables: tableList.length,
        totalRecordsFetched,
        totalRecordsInserted,
        tableDetails
      }

      // Update state logs
      const updatedLogs = [newLog, ...logs].slice(0, 30) // Keep latest 30 logs
      setLogs(updatedLogs)

      // Update last sync time
      const nowIso = new Date().toISOString()
      setLastSyncTime(nowIso)

      // Persist logs & last sync time in localStorage
      localStorage.setItem('strata_backup_logs', JSON.stringify(updatedLogs))
      
      const updatedConfig = {
        targetUrl: targetUrl.trim(),
        targetKey: targetKey.trim(),
        intervalHours: Number(intervalHours),
        lastSyncTime: nowIso
      }
      localStorage.setItem('strata_backup_config', JSON.stringify(updatedConfig))

      // Persist logs & config in Supabase settings
      await supabase
        .from(TABLES.SETTINGS)
        .upsert([
          { key_name: 'backup_logs', value: JSON.stringify(updatedLogs) },
          { key_name: 'backup_config', value: JSON.stringify(updatedConfig) }
        ])

    } catch (err) {
      setSyncError(`Backup process failed: ${err.message}`)
    } finally {
      setIsSyncing(false)
      setCurrentTableSyncing('')
    }
  }

  // Clear Logs Handler
  async function handleClearLogs() {
    if (!window.confirm('Are you sure you want to clear all backup fetch logs?')) return
    setLogs([])
    localStorage.removeItem('strata_backup_logs')
    try {
      await supabase
        .from(TABLES.SETTINGS)
        .upsert([{ key_name: 'backup_logs', value: JSON.stringify([]) }])
    } catch (err) {
      console.error('Failed to clear logs in DB:', err)
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '50px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontFamily: 'var(--font-display)' }}>Database Backup Setup</h2>
          <p className="muted" style={{ margin: '5px 0 0 0', fontSize: '0.92rem' }}>
            Fetch all live database tables and clone safely into target backup Supabase database.
          </p>
        </div>

        {/* Live Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 16px',
          borderRadius: '20px',
          background: isSyncing ? 'rgba(59, 130, 246, 0.15)' : lastSyncTime ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          border: `1px solid ${isSyncing ? '#3b82f6' : lastSyncTime ? '#10b981' : '#f59e0b'}`
        }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isSyncing ? '#3b82f6' : lastSyncTime ? '#10b981' : '#f59e0b',
            boxShadow: `0 0 10px ${isSyncing ? '#3b82f6' : lastSyncTime ? '#10b981' : '#f59e0b'}`
          }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSyncing ? '#3b82f6' : lastSyncTime ? '#10b981' : '#f59e0b' }}>
            {isSyncing ? 'Backing Up Data...' : lastSyncTime ? 'Backup Ready' : 'Setup Required'}
          </span>
        </div>
      </div>

      {/* Top Banner Info */}
      <div className="card" style={{
        padding: '16px 20px',
        marginBottom: '25px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <span style={{ fontSize: '1.8rem' }}>🛡️</span>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '0.95rem', color: '#e0e7ff' }}>Safe Append vs. Refresh & Refill Protocols</strong>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.4' }}>
            <strong>Fetch Now</strong> appends missing live rows into the backup database without overwriting existing data. 
            <strong>Refresh & Refill</strong> clears existing target table records and performs a complete fresh initial sync.
          </p>
        </div>
      </div>

      {/* Grid Layout: Config Form & Control Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '25px', marginBottom: '30px' }}>
        
        {/* Card 1: Backup Database Credentials */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔑</span> Target Supabase Credentials
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Target Supabase URL
            </label>
            <input
              type="text"
              placeholder="https://your-backup-project.supabase.co"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'rgba(0, 0, 0, 0.2)',
                color: '#fff',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Target Supabase Key (Anon / Service Role)
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'rgba(0, 0, 0, 0.2)',
                color: '#fff',
                fontSize: '0.9rem',
                fontFamily: showKey ? 'monospace' : 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {connectionStatus && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              background: connectionStatus.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${connectionStatus.type === 'success' ? '#10b981' : '#ef4444'}`,
              color: connectionStatus.type === 'success' ? '#34d399' : '#f87171'
            }}>
              {connectionStatus.msg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleTestConnection}
              disabled={testingConnection || !targetUrl || !targetKey}
              className="btn"
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {testingConnection ? 'Testing...' : '⚡ Test Connection'}
            </button>

            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="btn"
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {savingConfig ? 'Saving...' : '💾 Save Settings'}
            </button>
          </div>

          {configStatus && (
            <p style={{
              marginTop: '10px',
              fontSize: '0.8rem',
              color: configStatus.type === 'success' ? '#34d399' : '#f87171',
              marginBottom: 0
            }}>
              {configStatus.msg}
            </p>
          )}
        </div>

        {/* Card 2: Auto Sync Schedule & Action Control */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⏱️</span> Auto-Fetch Timing & Controls
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Auto Fetch Schedule Interval
              </label>
              <select
                value={intervalHours}
                onChange={(e) => setIntervalHours(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                {AUTO_INTERVAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ background: '#1e1e2e' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Schedule Status Box */}
            <div style={{
              padding: '14px',
              borderRadius: '10px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.83rem' }}>
                <span className="muted">Next Scheduled Fetch:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{nextSyncFormatted}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
                <span className="muted">Last Successful Backup:</span>
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>
                  {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
          </div>

          {/* Sync Trigger Buttons Section */}
          <div>
            {syncError && (
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.82rem', marginBottom: '12px' }}>
                {syncError}
              </div>
            )}

            {isSyncing && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span>Progress: <strong>{currentTableSyncing}</strong></span>
                  <span>{syncProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${syncProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => runBackup('Manual', false)}
                disabled={isSyncing || !targetUrl || !targetKey}
                className="btn"
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isSyncing ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  boxShadow: isSyncing ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.3)',
                  transition: 'transform 0.2s'
                }}
              >
                {isSyncing ? '🔄 Syncing Tables...' : '🚀 Fetch Now (Append New Data)'}
              </button>

              <button
                onClick={() => runBackup('Manual', true)}
                disabled={isSyncing || !targetUrl || !targetKey}
                className="btn"
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  background: isSyncing ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.12)',
                  color: '#fbbf24',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.2s, background 0.2s'
                }}
              >
                🔄 Refresh Backup & Refill (Clear & Refill)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Fetch Logs Section */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>Latest Fetch Logs</h3>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
              Historical audit log of all manual, refresh-refill, and auto-scheduled database fetch operations.
            </p>
          </div>

          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Clear Logs
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', border: '1px dashed var(--border)', borderRadius: '12px' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>📋</span>
            No backup fetch logs recorded yet. Click <strong>"Fetch Now"</strong> or <strong>"Refresh Backup & Refill"</strong> above to perform your first backup!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: '#94a3b8' }}>
                  <th style={{ padding: '12px' }}>Execution Time</th>
                  <th style={{ padding: '12px' }}>Trigger / Mode</th>
                  <th style={{ padding: '12px' }}>Overall Status</th>
                  <th style={{ padding: '12px' }}>Total Rows Fetched</th>
                  <th style={{ padding: '12px' }}>Tables Processed</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: log.triggerType.includes('Refill') 
                          ? 'rgba(245, 158, 11, 0.15)' 
                          : log.triggerType === 'Manual' 
                          ? 'rgba(59, 130, 246, 0.15)' 
                          : 'rgba(168, 85, 247, 0.15)',
                        color: log.triggerType.includes('Refill') 
                          ? '#fbbf24' 
                          : log.triggerType === 'Manual' 
                          ? '#60a5fa' 
                          : '#c084fc',
                        border: `1px solid ${
                          log.triggerType.includes('Refill') 
                            ? '#f59e0b' 
                            : log.triggerType === 'Manual' 
                            ? '#3b82f6' 
                            : '#a855f7'
                        }`
                      }}>
                        {log.triggerType}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: log.overallStatus === 'Success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: log.overallStatus === 'Success' ? '#34d399' : '#fbbf24',
                        border: `1px solid ${log.overallStatus === 'Success' ? '#10b981' : '#f59e0b'}`
                      }}>
                        {log.overallStatus === 'Success' ? '✅ Success' : '⚠️ Warning'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#38bdf8' }}>
                      {log.totalRecordsFetched} rows
                    </td>
                    <td style={{ padding: '12px', color: '#cbd5e1' }}>
                      {log.tableDetails ? log.tableDetails.length : log.totalTables} tables
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSelectedLog(log)
                          setShowLogModal(true)
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid var(--border)',
                          color: '#fff',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        🔍 View Table Breakdown
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Table Breakdown Detail Modal */}
      {showLogModal && selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#181825',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Backup Run Table Breakdown</h3>
                <span className="muted" style={{ fontSize: '0.82rem' }}>
                  Ran at {new Date(selectedLog.timestamp).toLocaleString()} ({selectedLog.triggerType})
                </span>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <span className="muted" style={{ fontSize: '0.78rem' }}>Total Fetched</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}>{selectedLog.totalRecordsFetched}</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <span className="muted" style={{ fontSize: '0.78rem' }}>Total Inserted/Refilled</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>{selectedLog.totalRecordsInserted}</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <span className="muted" style={{ fontSize: '0.78rem' }}>Overall Status</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: selectedLog.overallStatus === 'Success' ? '#34d399' : '#f59e0b' }}>
                    {selectedLog.overallStatus}
                  </div>
                </div>
              </div>

              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>Tables Processed Details:</h4>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Table Name</th>
                    <th style={{ padding: '8px 12px' }}>Rows Fetched</th>
                    <th style={{ padding: '8px 12px' }}>Backup Write Status</th>
                    <th style={{ padding: '8px 12px' }}>Notes / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLog.tableDetails?.map((tbl, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#e0e7ff' }}>
                        <code>{tbl.tableName}</code>
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: tbl.fetchedCount > 0 ? '#38bdf8' : '#94a3b8' }}>
                        {tbl.fetchedCount} rows
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: tbl.status === 'Success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: tbl.status === 'Success' ? '#34d399' : '#f87171'
                        }}>
                          {tbl.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '0.78rem', color: tbl.errorMsg ? '#f87171' : '#64748b' }}>
                        {tbl.errorMsg ? tbl.errorMsg : selectedLog.triggerType.includes('Refill') ? 'Cleared & Refilled' : 'Synced without overwrite'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
              <button
                onClick={() => setShowLogModal(false)}
                className="btn"
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
