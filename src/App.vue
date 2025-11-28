<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const secret = ref('')
const isEncrypted = ref(false)
const originalSecret = ref('')
const timeRemaining = ref(10) // seconds
const totalTime = 10
let intervalId: number | null = null

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

function encryptSecret() {
  if (!secret.value.trim()) return
  
  originalSecret.value = secret.value
  secret.value = '***********'
  isEncrypted.value = true
  timeRemaining.value = totalTime
  
  startTimer()
}

function keepAlive() {
  timeRemaining.value = totalTime
}

function startTimer() {
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
  
  intervalId = window.setInterval(() => {
    timeRemaining.value--
    
    if (timeRemaining.value <= 0) {
      revealSecret()
    }
  }, 1000)
}

function revealSecret() {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
  
  secret.value = originalSecret.value
  isEncrypted.value = false
  originalSecret.value = ''
  timeRemaining.value = totalTime
}

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
})
</script>

<template>
  <div class="w-full h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 sm:px-8 overflow-hidden">
    <div class="max-w-2xl w-full">
      <!-- Header -->
      <div class="text-center mb-8 sm:mb-12">
        <h1 class="text-4xl sm:text-5xl font-bold text-slate-800 mb-3">
          ECPSS Demo
        </h1>
        <p class="text-base sm:text-lg text-slate-600">
          Electing Committees Proactive Secret Sharing
        </p>
      </div>
      
      <!-- Secret Input -->
      <div class="flex justify-center mb-6 sm:mb-8">
        <input 
          v-model="secret" 
          type="text" 
          class="w-full max-w-md px-6 py-4 text-lg text-center border-2 border-blue-500 rounded-full outline-none transition-all duration-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-300 bg-white"
          :disabled="isEncrypted"
          placeholder="Enter your secret..."
        />
      </div>
      
      <!-- Action Button Container -->
      <div class="flex flex-col items-center justify-center gap-4 min-h-[220px] sm:min-h-[240px]">
        <!-- Fixed Button Container -->
        <div class="w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
          <!-- Encrypt Button -->
          <button 
            v-if="!isEncrypted"
            @click="encryptSecret"
            class="w-full h-full rounded-full bg-blue-500 text-white font-bold text-base sm:text-lg uppercase tracking-wide transition-all duration-300 hover:bg-blue-600 hover:shadow-xl disabled:bg-slate-300 disabled:cursor-not-allowed disabled:hover:shadow-none"
            :disabled="!secret.trim()"
          >
            Encrypt
          </button>
          
          <!-- Keep Alive Button -->
          <button 
            v-else
            @click="keepAlive"
            class="relative w-full h-full rounded-full bg-green-500 text-white font-bold text-base sm:text-lg uppercase tracking-wide transition-all duration-300 hover:bg-green-600 hover:shadow-xl flex items-center justify-center"
          >
            <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e0e0e0"
                stroke-width="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                :stroke="strokeColor"
                stroke-width="8"
                :stroke-dasharray="dashArray"
                stroke-linecap="round"
                class="transition-all duration-300"
              />
            </svg>
            <span class="relative z-10">Keep Alive</span>
          </button>
        </div>
        
        <!-- Timer Display -->
        <div class="h-10 flex items-center justify-center">
          <div v-if="isEncrypted" class="text-2xl sm:text-3xl font-bold text-slate-700">
            {{ timeRemaining }}s
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
