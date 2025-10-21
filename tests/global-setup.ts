import { spawn, ChildProcess, exec, execSync } from 'child_process'
import { promisify } from 'util'
import { createServer } from 'net'

const execAsync = promisify(exec)
let wranglerProcess: ChildProcess | null = null
let testPort: number = 8789

// Helper function to find an available port
async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = createServer()
        server.listen(port, () => {
          server.close(() => resolve())
        })
        server.on('error', reject)
      })
      console.log(`Found available port: ${port}`)
      return port
    } catch (error) {
      // Port is in use, try next one
      continue
    }
  }
  throw new Error(`No available ports found starting from ${startPort}`)
}

// Helper function to kill all wrangler-related processes
async function killAllWranglerProcesses() {
  if (wranglerProcess) {
    try {
      // Try to kill the process group if supported
      if (wranglerProcess.pid) {
        process.kill(-wranglerProcess.pid, 'SIGKILL')
      }
    } catch (error) {
      // Fallback to killing individual process
      wranglerProcess.kill('SIGKILL')
    }
  }
  
  // Wait briefly for initial cleanup - gives the main process time to clean up its children
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Kill all related processes that might still be running
  const killCommands = [
    'pkill -9 -f "npm exec wrangler"',
    'pkill -9 -f "sh -c.*wrangler"',
    'pkill -9 -f "node.*wrangler"',
    'pkill -9 -f "wrangler.*dev.*--port.*8789"',
    'pkill -9 -f "workerd"'
  ]
  
  for (const cmd of killCommands) {
    try {
      await execAsync(`${cmd} 2>/dev/null || true`)
    } catch (error) {
      // Ignore errors
    }
  }
}

// Ensure cleanup on process exit
process.on('exit', () => {
  // Use execSync since this is synchronous context
  if (wranglerProcess) {
    wranglerProcess.kill('SIGKILL')
    // Also kill workerd and related processes synchronously
    try {
      execSync('pkill -9 -f "workerd" 2>/dev/null || true', { stdio: 'ignore' })
      execSync('pkill -9 -f "wrangler.*dev.*--port.*8789" 2>/dev/null || true', { stdio: 'ignore' })
      execSync('pkill -9 -f "npm exec wrangler" 2>/dev/null || true', { stdio: 'ignore' })
      execSync('pkill -9 -f "sh -c.*wrangler" 2>/dev/null || true', { stdio: 'ignore' })
      execSync('pkill -9 -f "node.*wrangler" 2>/dev/null || true', { stdio: 'ignore' })
    } catch (error) {
      // Ignore errors
    }
  }
})

process.on('SIGINT', async () => {
  await killAllWranglerProcesses()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await killAllWranglerProcesses()
  process.exit(0)
})

export async function setup() {
  // Skip wrangler setup if VITEST_GLOBAL_SETUP environment variable is set to empty string
  // This allows running tests without starting a wrangler server
  if (process.env.VITEST_GLOBAL_SETUP === '') {
    console.log('Skipping global wrangler setup (VITEST_GLOBAL_SETUP is empty)')
    return
  }

  console.log('Starting global wrangler dev server for all tests...')

  // Try to increase file descriptor limit for this process
  try {
    const { execSync } = await import('child_process')
    execSync('ulimit -n 65536 2>/dev/null || true', { stdio: 'ignore' })
  } catch (error) {
    // Ignore if ulimit fails
  }

  // Use dynamic port to avoid conflicts with dev servers - start much higher to avoid conflicts
  testPort = await findAvailablePort(9000)

  // Make the port available to tests via environment variable
  process.env.TEST_API_PORT = testPort.toString()
  console.log(`Using test port: ${testPort}`)

  // Check if port is already in use and try to kill existing processes
  try {
    await killExistingProcesses(testPort)
    // Wait a moment for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 2000))
  } catch (error) {
    console.warn('Warning: Could not check/kill existing processes on port', testPort, ':', error)
  }
  
  // Start wrangler dev in background with minimal file watching
  // Use detached to create a new process group that we can kill as a unit
  wranglerProcess = spawn('npx', ['wrangler', 'dev', '--port', testPort.toString(), '--env', 'development'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,  // Create new process group
    env: { 
      ...process.env, 
      NODE_ENV: 'test',
      // Reduce file watchers
      CHOKIDAR_USEPOLLING: 'false',
      CHOKIDAR_INTERVAL: '2000',
      // Disable source maps to reduce overhead
      NODE_OPTIONS: '--max-old-space-size=2048'
    }
  })

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Wrangler dev server failed to start within 45 seconds'))
    }, 45000)

    if (wranglerProcess?.stdout) {
      wranglerProcess.stdout.on('data', (data) => {
        const output = data.toString()
        if (output.includes('Ready on')) {
          clearTimeout(timeout)
          console.log('Global wrangler dev server started successfully')
          resolve()
        }
      })
    }

    if (wranglerProcess?.stderr) {
      wranglerProcess.stderr.on('data', (data) => {
        const stderrOutput = data.toString()
        console.error('Wrangler stderr:', stderrOutput)
        
        // If we detect port conflict, try to handle it gracefully
        if (stderrOutput.includes('Address already in use')) {
          clearTimeout(timeout)
          console.log('Port conflict detected, attempting to find alternative solution...')
          // Instead of rejecting, let's try to find an existing wrangler process
          checkExistingWranglerProcess().then((isRunning) => {
            if (isRunning) {
              console.log('Found existing wrangler process, using it for tests')
              resolve()
            } else {
              reject(new Error('Port conflict and no existing wrangler process found'))
            }
          }).catch(reject)
        }
      })
    }

    wranglerProcess?.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

async function killExistingProcesses(port: number): Promise<void> {
  try {
    // Kill ALL wrangler-related processes more aggressively
    // This includes npm exec, sh -c, node wrangler, and the actual wrangler processes
    const killCommands = [
      'pkill -9 -f "npm exec wrangler"',
      'pkill -9 -f "sh -c.*wrangler"',
      'pkill -9 -f "node.*wrangler"',
      'pkill -9 -f "wrangler.*dev.*--port.*8789"',  // More specific to our test server
      'pkill -9 -f "workerd"'
      // Don't kill esbuild service as it's used by Vite
    ]
    
    for (const cmd of killCommands) {
      try {
        await execAsync(`${cmd} 2>/dev/null || true`)
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        // Continue if pkill fails
      }
    }
    
    // Additional wait for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Find processes using the port
    const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || true`)
    const pids = stdout.trim().split('\n').filter(pid => pid)
    
    if (pids.length > 0) {
      console.log(`Found ${pids.length} processes on port ${port}, attempting to terminate them...`)
      
      // Force kill immediately to avoid hanging
      for (const pid of pids) {
        try {
          process.kill(parseInt(pid), 'SIGKILL')
        } catch (error) {
          // Process might already be dead, continue
        }
      }
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch (error) {
    // lsof might not be available or other errors, continue anyway
    console.warn('Could not check for existing processes:', error)
  }
}

async function checkExistingWranglerProcess(): Promise<boolean> {
  try {
    // Check if there's a wrangler process that might be serving on our port
    const { stdout } = await execAsync('pgrep -f "wrangler.*dev" || true')
    const wranglerPids = stdout.trim().split('\n').filter(pid => pid)
    
    if (wranglerPids.length > 0) {
      console.log('Found existing wrangler dev processes, checking if accessible...')
      // We could add a health check here if needed
      return true
    }
    return false
  } catch (error) {
    return false
  }
}

export async function teardown() {
  // Skip teardown if VITEST_GLOBAL_SETUP environment variable is set to empty string
  if (process.env.VITEST_GLOBAL_SETUP === '') {
    return
  }

  console.log('Stopping global wrangler dev server...')
  await killAllWranglerProcesses()
  console.log('Global wrangler dev server stopped')
}