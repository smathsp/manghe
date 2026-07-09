<template>
  <nav class="nav">
    <div class="container nav-inner">
      <a class="nav-brand" href="/">
        <span class="nav-brand-text">十周年盲盒你来选</span>
      </a>
      <div class="nav-actions">
        <button class="btn btn-ghost" @click="scrollToPool">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1"></rect>
          </svg>
          <span class="hidden sm:inline">设备池</span>
        </button>
        <button class="btn btn-primary" @click="$emit('reset')">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          <span class="hidden sm:inline">重置</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
defineEmits(['reset'])
const scrollToPool = () => {
  document.getElementById('item-pool')?.scrollIntoView({ behavior: 'smooth' })
}
</script>
