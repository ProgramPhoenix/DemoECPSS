<script setup lang="ts">
import { ref, nextTick } from 'vue'

export interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

const logs = ref<LogEntry[]>([])
const maxLogs = 100
const logContainer = ref<HTMLElement | null>(null)

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
  
  // Auto-scroll to bottom
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
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
  <div class="h-full flex flex-col">
    <!-- Terminal Header -->
    <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex gap-1.5">
          <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        <span class="text-sm font-semibold text-slate-300">Protocol Console</span>
      </div>
      <button 
        @click="clearLogs"
        class="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors duration-200 rounded-md hover:bg-white/5"
      >
        Clear
      </button>
    </div>

    <!-- Terminal Body with scroll -->
    <div ref="logContainer" class="flex-1 overflow-y-auto p-6 space-y-2 font-mono text-sm">
      <div 
        v-for="(log, index) in logs" 
        :key="index"
        class="flex gap-3 items-start animate-fade-in"
      >
        <span class="text-slate-500 text-xs shrink-0 pt-0.5">{{ log.timestamp }}</span>
        <div class="flex items-start gap-2 flex-1 min-w-0">
          <span class="shrink-0 pt-0.5">
            <svg v-if="log.type === 'success'" class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <svg v-else-if="log.type === 'error'" class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <svg v-else-if="log.type === 'warning'" class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <svg v-else class="w-4 h-4 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          </span>
          <span 
            class="break-words"
            :class="{
              'text-cyan-400': log.type === 'info',
              'text-green-400': log.type === 'success',
              'text-yellow-400': log.type === 'warning',
              'text-red-400': log.type === 'error'
            }"
          >{{ log.message }}</span>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="logs.length === 0" class="flex items-center justify-center h-full text-slate-500">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="text-sm">Waiting for protocol events...</p>
        </div>
      </div>
    </div>
  </div>
</template>
