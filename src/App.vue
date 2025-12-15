<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue'
import { ECPSSSimulator } from './crypto/ecpss'
import TerminalConsole from './components/TerminalConsole.vue'

const secret = ref('')
const isEncrypted = ref(false)
const originalSecret = ref('')
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
  
  originalSecret.value = secret.value
  secret.value = '*'.repeat(originalSecret.value.length)
  isEncrypted.value = true
  timeRemaining.value = totalTime
  
  await ecpss.encryptSecret(originalSecret.value)
  
  startTimer()
}

async function keepAlive() {
  keepAliveFlag = true
  addLog('Keep-Alive flag set', 'info')
}

function startTimer() {
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
  
  intervalId = window.setInterval(() => {
    timeRemaining.value--
    
    if (timeRemaining.value <= 0) {
      handleTimerExpiry()
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
  
  await ecpss.reconstructSecret()
  
  secret.value = originalSecret.value
  isEncrypted.value = false
  originalSecret.value = ''
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
  <div class="relative w-full h-screen bg-black overflow-hidden flex">
    <!-- Global grid background -->
    <div class="absolute inset-0 z-0" 
         style="background-image: linear-gradient(rgba(0, 255, 255, 0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.8) 1px, transparent 1px); background-size: 40px 40px; opacity: 0.1;">
    </div>
    
    <!-- Console Widget - Left Side Full Height -->
    <TerminalConsole ref="terminalRef" />

    <!-- Main Content - Right Side -->
    <div class="w-1/2 h-screen flex items-center justify-center px-8 py-6 relative z-10">
      <!-- Fade overlay for right side -->
      <div class="absolute top-0 left-0 right-0 h-full pointer-events-none z-[1]"
           style="background: linear-gradient(to bottom, 
                  rgba(0, 0, 0, 1) 0%, 
                  rgba(0, 0, 0, 0.98) 5%,
                  rgba(0, 0, 0, 0.95) 10%,
                  rgba(0, 0, 0, 0.9) 20%,
                  rgba(0, 0, 0, 0.8) 30%,
                  rgba(0, 0, 0, 0.65) 40%,
                  rgba(0, 0, 0, 0.5) 50%,
                  rgba(0, 0, 0, 0.35) 60%,
                  rgba(0, 0, 0, 0.2) 70%,
                  rgba(0, 0, 0, 0.1) 80%,
                  rgba(0, 0, 0, 0.03) 90%,
                  rgba(0, 0, 0, 0) 100%);">
      </div>
      
      <div class="max-w-xl w-full relative z-10">
        <!-- Header with glow effect -->
        <div class="text-center mb-96">
          <h1 class="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-20 tracking-tight">
            ECPSS
          </h1>
          <p class="text-sm sm:text-base text-gray-400 font-mono tracking-wider">
            Electing Committees<br>Proactive Secret Sharing
          </p>
        </div>
      
        <!-- Secret Input with cyber style -->
        <div class="flex justify-center" style="margin-bottom: 1rem;">
          <div class="relative w-full">
            <input 
              v-model="secret" 
              type="text" 
              class="relative w-full px-6 py-4 text-lg text-center bg-gray-900 text-cyan-400 border border-cyan-500/30 rounded-lg outline-none transition-all duration-300 focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:border-gray-700 font-mono placeholder:text-gray-600"
              :disabled="isEncrypted"
              placeholder="// enter secret..."
            />
          </div>
        </div>
        
        <!-- Action Button Container -->
        <div class="flex flex-col items-center justify-center gap-6 min-h-[240px]">
          <!-- Fixed Button Container -->
          <div class="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center relative">
            <!-- Encrypt Button -->
            <button 
              v-if="!isEncrypted"
              @click="encryptSecret"
              class="relative w-full h-full group"
              :disabled="!secret.trim()"
            >
              <div class="absolute inset-0 rounded-full opacity-70 blur-md transition duration-300 group-disabled:opacity-0"
                   :class="secret.trim() ? 'bg-gradient-to-r from-cyan-500 to-blue-600 group-hover:opacity-100' : ''"></div>
              <div class="relative w-full h-full rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl uppercase tracking-wider transition-all duration-300 shadow-xl"
                   :class="secret.trim() 
                     ? 'bg-gradient-to-br from-cyan-500 to-blue-600 hover:scale-105' 
                     : 'bg-gray-800 border-2 border-gray-700 opacity-50 cursor-not-allowed'">
                <span class="flex items-center gap-2">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Encrypt
                </span>
              </div>
            </button>
            
            <!-- Keep Alive Button -->
            <button 
              v-else
              @click="keepAlive"
              class="relative w-full h-full group"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full opacity-70 blur-md group-hover:opacity-100 transition duration-300"></div>
              <div class="relative w-full h-full rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-xl">
                <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(0,0,0,0.3)"
                    stroke-width="6"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    :stroke="strokeColor"
                    stroke-width="6"
                    :stroke-dasharray="dashArray"
                    stroke-linecap="round"
                    class="transition-all duration-300 drop-shadow-lg"
                  />
                </svg>
                <span class="relative z-10 text-white font-bold text-lg sm:text-xl uppercase tracking-wider">
                  Keep Alive
                </span>
              </div>
            </button>
          </div>
          
          <!-- Timer Display with effects -->
          <div class="h-14 flex items-center justify-center">
            <div v-if="isEncrypted" 
                 class="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 font-mono tabular-nums tracking-wider animate-pulse">
              {{ timeRemaining }}s
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
