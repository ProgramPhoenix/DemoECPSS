<script setup lang="ts">
import { ref } from 'vue'

export interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

const logs = ref<LogEntry[]>([])
const maxLogs = 100

function addLog(message: string, type: LogEntry['type'] = 'info') {
  const now = new Date()
  const timestamp = now.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  
  logs.value.push({
    timestamp,
    message,
    type
  })
  
  // Keep only the last maxLogs entries
  if (logs.value.length > maxLogs) {
    logs.value.shift()
  }
}

function clearLogs() {
  logs.value = []
}

// Expose functions for parent component
defineExpose({
  addLog,
  clearLogs
})
</script>

<template>
  <div class="w-1/2 h-screen overflow-hidden relative z-10">
    <!-- Console Content Container - Absolutely positioned to fill entire screen height -->
    <div class="absolute inset-0 flex flex-col justify-end">
      <!-- Fade overlay for logs -->
      <div class="absolute top-0 left-0 right-0 h-full pointer-events-none z-10"
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
      
      <div class="space-y-1 relative z-0 font-mono text-xs sm:text-sm p-4 pb-6 flex flex-col-reverse overflow-hidden" style="max-height: 100%;">
        <div 
          v-for="(log, index) in logs.slice().reverse()" 
          :key="logs.length - 1 - index"
          class="transition-opacity duration-500"
          :class="{
            'text-cyan-400': log.type === 'info',
            'text-green-500': log.type === 'success',
            'text-yellow-500': log.type === 'warning',
            'text-red-500': log.type === 'error'
          }"
        >
          <span 
            class="text-gray-500"
            :class="{ 'text-white': logs.length - 1 - index === logs.length - 1 }"
          >[{{ log.timestamp }}]</span>
          <span 
            class="ml-2"
            :class="{ 'font-bold': logs.length - 1 - index === logs.length - 1 }"
          >{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
