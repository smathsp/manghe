<template>
  <nav class="nav">
    <div class="container nav-inner">
      <div class="nav-actions">
        <a class="btn btn-ghost" href="/activate/">激活流程</a>
        <a class="btn btn-ghost" href="/result/">查看结果</a>
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
