<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue'
import { ECPSSSimulator } from './crypto/ecpss'
import TerminalConsole from './components/TerminalConsole.vue'

const secret = ref('')
const isEncrypted = ref(false)
const timeRemaining = ref(10) // seconds
const totalTime = 10
let intervalId: number | null = null
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
  return (timeRemaining.value / totalTime) * 100
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
  timeRemaining.value = totalTime
  
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
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
  
  intervalId = window.setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--
    }
    
    if (timeRemaining.value === 0) {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
      
      // Wait for the transition to 0% to complete visually
      setTimeout(() => {
        handleTimerExpiry()
      }, 1000)
    }
  }, 1000)
}

async function handleTimerExpiry() {
  if (keepAliveFlag) {
    // Keep-alive was pressed, start new epoch
    keepAliveFlag = false
    timeRemaining.value = totalTime
    await ecpss.keepAlive()
    addLog('New epoch started', 'success')
    startTimer()
  } else {
    // No keep-alive, reveal secret
    await revealSecret()
  }
}

async function revealSecret() {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
  
  const reconstructed = await ecpss.reconstructSecret()
  
  if (reconstructed) {
    secret.value = reconstructed
  } else {
    secret.value = 'Failed to reconstruct'
  }
  
  isEncrypted.value = false
  timeRemaining.value = totalTime
  keepAliveFlag = false
}

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
})
</script>

<template>
  <div class="relative w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 overflow-hidden">
    <!-- Animated background patterns -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute w-full h-full opacity-10">
        <div class="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-blob"></div>
        <div class="absolute top-0 right-0 w-96 h-96 bg-cyan-500 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
        <div class="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      <!-- Subtle grid -->
      <div class="absolute inset-0 bg-grid-pattern opacity-5"></div>
    </div>

    <!-- Main Container -->
    <div class="relative z-10 h-full flex flex-col">
      <!-- Header -->
      <header class="px-8 py-8 border-b border-white/5 backdrop-blur-sm bg-black/20">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              ECPSS Protocol
            </h1>
            <p class="text-sm text-slate-400 mt-1 font-mono">Electing Committees Proactive Secret Sharing</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="px-8 py-5 rounded-2xl bg-white/5 border border-white/10 min-w-[240px] text-center">
              <span class="text-base text-slate-400 uppercase tracking-wider mb-4 block font-medium">System Status</span>
              <div class="flex items-center justify-center gap-6">
                <div class="w-5 h-5 rounded-full animate-pulse shadow-lg" :class="isEncrypted ? 'bg-green-500 shadow-green-500/50' : 'bg-slate-500'"></div>
                <span class="text-2xl font-bold text-white">{{ isEncrypted ? 'Active' : 'Idle' }}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Left Panel - Control Center -->
        <div class="w-1/2 flex items-center justify-center p-8">
          <div class="max-w-md w-full flex flex-col gap-10">
            <!-- Control Card -->
            <div class="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl p-8 pb-24 overflow-hidden">
              <div class="text-center mb-6">
                <h2 class="text-xl font-semibold text-white mb-2">Secret Management</h2>
                <p class="text-sm text-slate-400">Enter your secret to begin the protocol</p>
              </div>

              <!-- Secret Input -->
              <div class="mb-8">
                <label class="block text-xs text-slate-400 uppercase tracking-wider mb-3">Secret Input</label>
                <div class="relative">
                  <input 
                    v-model="secret" 
                    type="text" 
                    class="w-full px-4 py-3 bg-slate-900/50 text-white border border-slate-700 rounded-lg outline-none transition-all duration-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-center"
                    :disabled="isEncrypted"
                    placeholder="Enter secret message..."
                  />
                  <div v-if="isEncrypted" class="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Action Button -->
              <div class="space-y-4">
                <button 
                  v-if="!isEncrypted"
                  @click="encryptSecret"
                  :disabled="!secret.trim()"
                  class="w-full py-4 rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden group"
                >
                  <div class="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 transition-transform duration-300 group-hover:scale-105 group-disabled:scale-100"></div>
                  <div class="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span class="relative flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Initiate Encryption
                  </span>
                </button>

                <button 
                  v-else
                  @click="keepAlive"
                  class="w-full py-4 rounded-xl font-semibold text-white transition-all duration-300 relative overflow-hidden group"
                >
                  <div class="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 transition-transform duration-300 group-hover:scale-105"></div>
                  <div class="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span class="relative flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Continue Protocol
                  </span>
                </button>
              </div>

              <!-- Timer Display -->
              <div v-if="isEncrypted" class="mt-8 pt-8 border-t border-white/10 pb-16">
                <div class="flex items-center justify-between mb-6">
                  <span class="text-xs text-slate-400 uppercase tracking-wider">Time Remaining</span>
                  <span class="text-2xl font-bold font-mono text-white">{{ timeRemaining }}s</span>
                </div>
                <div class="relative h-2 bg-slate-800 rounded-full overflow-hidden mx-12">
                  <div 
                    class="absolute inset-y-0 left-0 transition-all duration-1000 ease-linear"
                    :class="progressPercentage > 66 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : progressPercentage > 33 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-red-500 to-pink-500'"
                    :style="{ width: progressPercentage + '%' }"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Stats Card -->
            <div class="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl p-6">
              <h3 class="text-sm font-semibold text-white mb-6 uppercase tracking-wider text-center">Protocol Info</h3>
              <div class="grid grid-cols-3 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-cyan-400">10</div>
                  <div class="text-xs text-slate-400 mt-1">Nodes</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-400">5</div>
                  <div class="text-xs text-slate-400 mt-1">Committee</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-purple-400">3</div>
                  <div class="text-xs text-slate-400 mt-1">Threshold</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel - Terminal Console -->
        <div class="w-1/2 border-l border-white/10 backdrop-blur-sm bg-black/20">
          <TerminalConsole ref="terminalRef" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes blob {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

.bg-grid-pattern {
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 50px 50px;
}
</style>
