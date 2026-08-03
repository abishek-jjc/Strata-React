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

      localStorage.setItem('strata_backup_config', JSON.stringify(configObj))

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
      const cleanUrl = targetUrl.trim().replace(/\/+$/, '')
      const cleanKey = targetKey.trim().replace(/^['"]|['"]$/g, '')

      const targetClient = createClient(cleanUrl, cleanKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
      const { error } = await targetClient.from(TABLES.SETTINGS).select('key_name').limit(1)

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setConnectionStatus({ type: 'success', msg: 'Connection successful! Target Supabase is accessible.' })
    } catch (err) {
      setConnectionStatus({ type: 'error', msg: `Connection failed: ${err.message}` })
    } finally {
      setTestingConnection(false)
    }
  }

  // Helper: Resilient batch write that automatically strips missing columns if target DB schema cache lacks them
  async function resilientWrite(targetClient, tbl, rows, isWipeAndRefill) {
    let currentRows = [...rows]
    let maxRetries = 5
    let omittedCols = []

    while (maxRetries > 0) {
      const { error } = isWipeAndRefill
        ? await targetClient.from(tbl).upsert(currentRows, { ignoreDuplicates: false })
        : await targetClient.from(tbl).upsert(currentRows, { ignoreDuplicates: true })

      if (!error) {
        return { success: true, count: currentRows.length, omittedCols, error: null }
      }

      const match = error.message && error.message.match(/Could not find the '([^']+)' column of/i)
      if (match && match[1]) {
        const missingCol = match[1]
        omittedCols.push(missingCol)
        currentRows = currentRows.map(r => {
          const copy = { ...r }
          delete copy[missingCol]
          return copy
        })
        maxRetries--
        continue
      }

      return { success: false, count: 0, omittedCols, error }
    }

    return { success: false, count: 0, omittedCols, error: new Error('Max retries exceeded while sanitizing columns') }
  }

  // Helper: Row-by-row fallback when batch operations fail due to FK constraints
  async function rowByRowFallback(targetClient, tbl, rows, isWipeAndRefill, omittedCols = []) {
    let successCount = 0
    let skippedCount = 0
    let lastErr = null

    for (const r of rows) {
      let singleRow = { ...r }
      for (const col of omittedCols) {
        delete singleRow[col]
      }

      const { error } = isWipeAndRefill
        ? await targetClient.from(tbl).upsert([singleRow], { ignoreDuplicates: false })
        : await targetClient.from(tbl).upsert([singleRow], { ignoreDuplicates: true })

      if (!error) {
        successCount++
      } else {
        const match = error.message && error.message.match(/Could not find the '([^']+)' column of/i)
        if (match && match[1]) {
          delete singleRow[match[1]]
          const { error: err2 } = await targetClient.from(tbl).upsert([singleRow], { ignoreDuplicates: true })
          if (!err2) {
            successCount++
            continue
          }
        }
        skippedCount++
        lastErr = error
      }
    }

    return { successCount, skippedCount, lastErr }
  }

  // Core Backup Execution Engine
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
    const cleanUrl = targetUrl.trim().replace(/\/+$/, '')
    const cleanKey = targetKey.trim().replace(/^['"]|['"]$/g, '')

    const targetClient = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    try {
      if (isWipeAndRefill) {
        setCurrentTableSyncing('Clearing target database tables...')
        const wipeOrder = [...tableList].reverse()
        for (const tbl of wipeOrder) {
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
      }

      for (let i = 0; i < tableList.length; i++) {
        const tbl = tableList[i]
        setCurrentTableSyncing(isWipeAndRefill ? `Refilling ${tbl}...` : `Syncing ${tbl}...`)
        setSyncProgress(Math.round(((i) / tableList.length) * 100))

        let fetchedCount = 0
        let status = 'Success'
        let errorMsg = null
        let sampleData = []

        try {
          const { data: rows, error: fetchErr } = await supabase
            .from(tbl)
            .select('*')

          if (fetchErr) throw fetchErr

          fetchedCount = rows ? rows.length : 0
          totalRecordsFetched += fetchedCount
          if (rows && rows.length > 0) {
            sampleData = rows.slice(0, 3)
          }

          if (fetchedCount > 0) {
            const result = await resilientWrite(targetClient, tbl, rows, isWipeAndRefill)

            if (result.success) {
              totalRecordsInserted += result.count
              if (result.omittedCols.length > 0) {
                errorMsg = `Synced (omitted unsupported target cols: ${result.omittedCols.join(', ')})`
              }
            } else {
              const fallback = await rowByRowFallback(targetClient, tbl, rows, isWipeAndRefill, result.omittedCols)

              totalRecordsInserted += fallback.successCount

              if (tbl === TABLES.PROFILES) {
                if (fallback.skippedCount > 0) {
                  status = fallback.successCount > 0 ? 'Success' : 'Partial Warning'
                  errorMsg = `Inserted ${fallback.successCount}/${fetchedCount} profiles (skipped ${fallback.skippedCount} profiles without target auth accounts)`
                }
              } else {
                if (fallback.skippedCount > 0) {
                  hasFailures = true
                  status = fallback.successCount > 0 ? 'Partial Warning' : 'Failed'
                  errorMsg = `Inserted ${fallback.successCount}/${fetchedCount} rows. Error on remaining: ${fallback.lastErr?.message}`
                } else {
                  if (result.omittedCols.length > 0) {
                    errorMsg = `Synced (omitted unsupported target cols: ${result.omittedCols.join(', ')})`
                  }
                }
              }
            }
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

      const updatedLogs = [newLog, ...logs].slice(0, 30)
      setLogs(updatedLogs)

      const nowIso = new Date().toISOString()
      setLastSyncTime(nowIso)

      localStorage.setItem('strata_backup_logs', JSON.stringify(updatedLogs))
      
      const updatedConfig = {
        targetUrl: targetUrl.trim(),
        targetKey: targetKey.trim(),
        intervalHours: Number(intervalHours),
        lastSyncTime: nowIso
      }
      localStorage.setItem('strata_backup_config', JSON.stringify(updatedConfig))

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
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Database Backup Setup
          </h2>
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
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <span style={{ fontSize: '1.8rem' }}>🛡️</span>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Safe Append vs. Refresh & Refill Protocols</strong>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            <strong>Fetch Now</strong> appends missing live rows into the backup database without overwriting existing data. 
            <strong>Refresh & Refill</strong> clears existing target table records and performs a complete fresh initial sync.
          </p>
        </div>
      </div>

      {/* Grid Layout: Config Form & Control Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '25px', marginBottom: '30px' }}>
        
        {/* Card 1: Backup Database Credentials */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <span>🔑</span> Target Supabase Credentials
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Target Supabase URL
            </label>
            <input
              type="text"
              className="input"
              placeholder="https://your-backup-project.supabase.co"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Target Supabase Key (Anon / Service Role)
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showKey ? 'text' : 'password'}
              className="input"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              style={{
                width: '100%',
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
              color: connectionStatus.type === 'success' ? '#10b981' : '#ef4444'
            }}>
              {connectionStatus.msg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleTestConnection}
              disabled={testingConnection || !targetUrl || !targetKey}
              className="btn"
              style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              {testingConnection ? 'Testing...' : '⚡ Test Connection'}
            </button>

            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="btn btn-primary"
              style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              {savingConfig ? 'Saving...' : '💾 Save Settings'}
            </button>
          </div>

          {configStatus && (
            <p style={{
              marginTop: '10px',
              fontSize: '0.8rem',
              color: configStatus.type === 'success' ? '#10b981' : '#ef4444',
              marginBottom: 0
            }}>
              {configStatus.msg}
            </p>
          )}
        </div>

        {/* Card 2: Auto Sync Schedule & Action Control */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <span>⏱️</span> Auto-Fetch Timing & Controls
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Auto Fetch Schedule Interval
              </label>
              <select
                className="input"
                value={intervalHours}
                onChange={(e) => setIntervalHours(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                {AUTO_INTERVAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Schedule Status Box */}
            <div style={{
              padding: '14px',
              borderRadius: '10px',
              background: 'rgba(0, 0, 0, 0.04)',
              border: '1px solid var(--border)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.83rem' }}>
                <span className="muted">Next Scheduled Fetch:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{nextSyncFormatted}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
                <span className="muted">Last Successful Backup:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
          </div>

          {/* Sync Trigger Buttons Section */}
          <div>
            {syncError && (
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.82rem', marginBottom: '12px' }}>
                {syncError}
              </div>
            )}

            {isSyncing && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  <span>Progress: <strong>{currentTableSyncing}</strong></span>
                  <span>{syncProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(0, 0, 0, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
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
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
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
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: '#f59e0b',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                }}
              >
                🔄 Refresh Backup & Refill (Clear & Refill)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Fetch Logs Section */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Latest Fetch Logs</h3>
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
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '12px' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>📋</span>
            No backup fetch logs recorded yet. Click <strong>"Fetch Now"</strong> or <strong>"Refresh Backup & Refill"</strong> above to perform your first backup!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
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
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
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
                          ? '#f59e0b' 
                          : log.triggerType === 'Manual' 
                          ? '#3b82f6' 
                          : '#a855f7',
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
                        color: log.overallStatus === 'Success' ? '#10b981' : '#f59e0b',
                        border: `1px solid ${log.overallStatus === 'Success' ? '#10b981' : '#f59e0b'}`
                      }}>
                        {log.overallStatus === 'Success' ? '✅ Success' : '⚠️ Warning'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                      {log.totalRecordsFetched} rows
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      {log.tableDetails ? log.tableDetails.length : log.totalTables} tables
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSelectedLog(log)
                          setShowLogModal(true)
                        }}
                        className="btn"
                        style={{
                          padding: '6px 14px',
                          fontSize: '0.8rem',
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
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)'
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
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Backup Run Table Breakdown</h3>
                <span className="muted" style={{ fontSize: '0.82rem' }}>
                  Ran at {new Date(selectedLog.timestamp).toLocaleString()} ({selectedLog.triggerType})
                </span>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                style={{
                  background: 'rgba(0, 0, 0, 0.08)',
                  border: 'none',
                  color: 'var(--text-primary)',
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
                <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <span className="muted" style={{ fontSize: '0.78rem' }}>Total Fetched</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' }}>{selectedLog.totalRecordsFetched}</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <span className="muted" style={{ fontSize: '0.78rem' }}>Total Inserted/Refilled</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>{selectedLog.totalRecordsInserted}</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <span className="muted" style={{ fontSize: '0.78rem' }}>Overall Status</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: selectedLog.overallStatus === 'Success' ? '#10b981' : '#f59e0b' }}>
                    {selectedLog.overallStatus}
                  </div>
                </div>
              </div>

              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Tables Processed Details:</h4>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Table Name</th>
                    <th style={{ padding: '8px 12px' }}>Rows Fetched</th>
                    <th style={{ padding: '8px 12px' }}>Backup Write Status</th>
                    <th style={{ padding: '8px 12px' }}>Notes / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLog.tableDetails?.map((tbl, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <code>{tbl.tableName}</code>
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: tbl.fetchedCount > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {tbl.fetchedCount} rows
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: tbl.status === 'Success' ? 'rgba(16, 185, 129, 0.15)' : tbl.status === 'Partial Warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: tbl.status === 'Success' ? '#10b981' : tbl.status === 'Partial Warning' ? '#f59e0b' : '#ef4444'
                        }}>
                          {tbl.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '0.78rem', color: tbl.status === 'Failed' ? '#ef4444' : tbl.status === 'Partial Warning' ? '#f59e0b' : 'var(--text-secondary)' }}>
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
                className="btn btn-primary"
                style={{
                  padding: '8px 20px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
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
