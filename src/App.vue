<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue'
import { ECPSSSimulator } from './crypto/ecpss'
import TerminalConsole from './components/TerminalConsole.vue'

const secret = ref('')
const isEncrypted = ref(false)
const timeLeftMs = ref(10000)
const timeRemaining = computed(() => Math.ceil(timeLeftMs.value / 1000))
const totalTimeMs = 10000
let animationFrameId: number | null = null
let lastTimeStr = ''
let keepAliveFlag = false

// Terminal console reference
const terminalRef = ref<InstanceType<typeof TerminalConsole> | null>(null)

// Helper function to add logs
const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  terminalRef.value?.addLog(message, type)
}

// ECPSS Simulator
let ecpss: ECPSSSimulator

const progressPercentage = computed(() => {
  return (timeLeftMs.value / totalTimeMs) * 100
})

const dashArray = computed(() => {
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const progress = progressPercentage.value / 100
  const dashLength = circumference * progress
  return `${dashLength} ${circumference}`
})

const strokeColor = computed(() => {
  const percentage = progressPercentage.value
  if (percentage > 66) return '#10b981' // green-500
  if (percentage > 33) return '#f59e0b' // amber-500
  return '#ef4444' // red-500
})

// Initialize on mount
async function initializeSystem() {
  ecpss = new ECPSSSimulator(addLog)
  await ecpss.initialize()
}

onMounted(() => {
  initializeSystem()
})

async function encryptSecret() {
  if (!secret.value.trim()) return
  
  const secretToEncrypt = secret.value
  secret.value = '*'.repeat(secretToEncrypt.length)
  isEncrypted.value = true
  timeLeftMs.value = totalTimeMs
  
  await ecpss.encryptSecret(secretToEncrypt)
  
  startTimer()
}

async function keepAlive() {
  if (!keepAliveFlag) {
    keepAliveFlag = true
    addLog('Keep-Alive flag set', 'info')
  }
}

function startTimer() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
  
  let lastTimestamp = performance.now()
  
  const animate = (timestamp: number) => {
    const delta = timestamp - lastTimestamp
    lastTimestamp = timestamp
    
    timeLeftMs.value = Math.max(0, timeLeftMs.value - delta)
    
    if (timeLeftMs.value > 0) {
      animationFrameId = requestAnimationFrame(animate)
    } else {
      handleTimerExpiry()
    }
  }
  
  animationFrameId = requestAnimationFrame(animate)
}

async function handleTimerExpiry() {
  if (keepAliveFlag) {
    // Keep-alive was pressed, start new epoch
    keepAliveFlag = false
    timeLeftMs.value = totalTimeMs
    await ecpss.keepAlive()
    addLog('New epoch started', 'success')
    startTimer()
  } else {
    // No keep-alive, reveal secret
    await revealSecret()
  }
}

async function revealSecret() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  const reconstructed = await ecpss.reconstructSecret()
  
  if (reconstructed) {
    secret.value = reconstructed
  } else {
    secret.value = 'Failed to reconstruct'
  }
  
  isEncrypted.value = false
  timeLeftMs.value = totalTimeMs
  keepAliveFlag = false
}

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white font-sans overflow-hidden relative selection:bg-cyan-500/30 selection:text-cyan-200">
    <!-- Ambient Background Effects -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.03),transparent_70%)]"></div>
      <div class="absolute inset-0" style="background-image: radial-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 1px); background-size: 50px 50px; opacity: 0.15;"></div>
    </div>

    <!-- Main Container -->
    <main class="relative z-10 w-full max-w-[90rem] mx-auto px-4 lg:px-8 min-h-screen flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 py-8 md:py-16">
      
      <!-- Left Panel: Controls & Status -->
      <div class="flex flex-col justify-center w-full max-w-xl">
        <!-- Header -->
        <header class="mb-8 text-center md:text-left animate-fade-in-down">
          <div class="inline-block px-3 py-1 mb-4 rounded-full bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 text-xs font-mono tracking-widest uppercase">
            Secure Environment v2.0
          </div>
          <h1 class="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-2">
            EC<span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-500">PSS</span>
          </h1>
          <p class="text-gray-400 tracking-wide text-sm md:text-base border-l-2 border-cyan-500/30 pl-4 mt-4 max-w-md">
            Electing Committees Proactive Secret Sharing
            <br/><span class="text-gray-600 text-xs">Protocol Simulator</span>
          </p>
        </header>

        <!-- Control Card -->
        <div class="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden group">
          <!-- Decorative Corner accents -->
          <div class="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-cyan-500/30 rounded-tl-2xl pointer-events-none"></div>
          <div class="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-cyan-500/30 rounded-br-2xl pointer-events-none"></div>

          <!-- Secret Input Section -->
          <div class="mb-10 relative mt-2">
            <label class="block text-xs font-mono text-cyan-500 mb-2 uppercase tracking-wider ml-2">
              Secret Payload
            </label>
            <div class="relative">
              <input 
                v-model="secret" 
                type="text" 
                class="w-full bg-gray-950/80 text-white px-5 py-4 rounded-xl border border-gray-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 outline-none transition-all duration-300 font-mono text-lg text-center tracking-widest placeholder:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isEncrypted"
                placeholder="ENTER_SENSITIVE_DATA"
                spellcheck="false"
              />
              <div v-if="isEncrypted" class="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
            </div>
          </div>

          <!-- Main Action / Timer Circle -->
          <div class="flex flex-col items-center justify-center">
            <div class="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center">
              
              <!-- SVG Timer Ring -->
              <svg class="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <!-- Track -->
                <circle cx="50" cy="50" r="45" fill="none" class="stroke-gray-800" stroke-width="2" />
                <!-- Progress Indicator (Only visible when active) -->
                <circle
                  v-if="isEncrypted"
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  :stroke="strokeColor"
                  stroke-width="3"
                  :stroke-dasharray="dashArray"
                  stroke-linecap="round"
                  class="shadow-[0_0_15px_currentColor]"
                />
              </svg>

              <!-- Central Interactive Button Area -->
              <div class="relative z-10 w-48 h-48 rounded-full flex items-center justify-center p-4">
                
                <!-- STATE: NOT ENCRYPTED -->
                <button 
                  v-if="!isEncrypted"
                  @click="encryptSecret"
                  :disabled="!secret.trim()"
                  class="w-full h-full rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex flex-col items-center justify-center gap-2 group/btn transition-all duration-300 hover:scale-105 active:scale-95 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <div class="p-3 rounded-full bg-gray-950/50 group-hover/btn:bg-cyan-500/10 transition-colors">
                    <svg class="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <span class="font-mono text-sm tracking-widest text-cyan-300 uppercase">Initialize</span>
                </button>

                <!-- STATE: ENCRYPTED (Timer Running) -->
                <button 
                  v-else
                  @click="keepAlive"
                  class="w-full h-full rounded-full bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden group/alive transition-all duration-200 active:scale-95 border-4 border-transparent hover:border-gray-800"
                >
                   <!-- Pulse BG -->
                  <div class="absolute inset-0 bg-emerald-500/10 animate-pulse-slow"></div>
                  
                  <div class="text-center z-10 flex flex-col items-center justify-center h-full w-full px-4">
                    <div class="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1 leading-tight">Time<br>Remaining</div>
                    <div class="text-5xl font-bold tabular-nums tracking-tighter my-1" :style="{ color: strokeColor }">
                      {{ timeRemaining }}
                    </div>
                    <div class="mt-1 px-3 py-1 rounded-md bg-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-300 group-hover/alive:bg-gray-700 group-hover/alive:text-white transition-colors border border-gray-700 w-full max-w-[100px] truncate">
                      Tap to Refresh
                    </div>
                  </div>
                </button>

              </div>
            </div>
            
            <div class="h-6 mt-4">
               <p v-if="timeRemaining < 4 && isEncrypted" class="text-rose-500 animate-pulse font-mono text-sm">⚠ CRITICAL TIMEOUT IMMINENT</p>
            </div>
          </div>

        </div>
      </div>

      <!-- Right Panel: Terminal -->
      <div class="w-full max-w-xl h-[600px] md:h-[800px] flex items-center">
        <TerminalConsole ref="terminalRef" class="w-full h-full shadow-2xl" />
      </div>

    </main>
  </div>
</template>

<style scoped>
.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
