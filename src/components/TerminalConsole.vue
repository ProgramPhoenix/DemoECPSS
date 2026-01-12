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
  <div class="h-full w-full flex flex-col bg-gray-900 border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden backdrop-blur-sm bg-opacity-90">
    <!-- Terminal Header -->
    <div class="flex items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div class="flex space-x-2">
        <div class="w-3 h-3 rounded-full bg-red-500"></div>
        <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div class="w-3 h-3 rounded-full bg-green-500"></div>
      </div>
      <div class="ml-4 text-xs text-gray-400 font-mono flex-1 text-center">system_logs.sh</div>
      <div class="w-10"></div> <!-- Spacer for balance -->
    </div>

    <!-- Console Content -->
    <div class="flex-1 relative overflow-hidden bg-black/80 font-mono text-xs sm:text-sm p-4">
       <!-- Fade overlay for top logs -->
       <div class="absolute top-0 left-0 right-0 h-8 z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"></div>

      <div class="h-full overflow-y-auto flex flex-col-reverse space-y-reverse space-y-1">
        <!-- Input Line (Simulated) -->
        <div class="text-cyan-400 opacity-80 mt-2">
          <span class="mr-2">$</span><span class="animate-pulse">_</span>
        </div>

        <div 
          v-for="(log, index) in logs.slice().reverse()" 
          :key="logs.length - 1 - index"
          class="transition-all duration-300 hover:bg-white/5 p-0.5 rounded"
          :class="{
            'text-cyan-300': log.type === 'info',
            'text-emerald-400': log.type === 'success',
            'text-amber-400': log.type === 'warning',
            'text-rose-500': log.type === 'error'
          }"
        >
          <span class="text-gray-600 select-none text-[10px] mr-2">[{{ log.timestamp }}]</span>
          <span class="mr-2 text-gray-500 select-none">&gt;</span>
          <span>{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
