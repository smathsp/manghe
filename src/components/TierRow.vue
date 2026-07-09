<template>
  <div class="tier-row" :class="rowClass" :data-rarity="rarity">
    <!-- Tier Label -->
    <div class="tier-label" :class="color">
      {{ label }}
      <span class="tier-count">{{ items.length }}/{{ max }}</span>
    </div>

    <!-- Tier Content (drop zone) -->
    <draggable
      :list="items"
      :group="{ name: 'items', pull: true, put: true }"
      item-key="id"
      :animation="200"
      ghost-class="ghost"
      chosen-class="chosen"
      class="tier-content"
      @change="onChange"
    >
      <template #item="{ element }">
        <div class="tier-item-wrap" :class="itemClass">
          <div class="tier-item" :class="{ 'tier-item-text': !element.image && !element.icon }">
            <template v-if="element.image">
              <img :src="element.image" :alt="element.name" />
            </template>
            <template v-else-if="element.icon">
              {{ element.icon }}
            </template>
            <template v-else>
              <span class="tier-item-text-label">{{ element.name }}</span>
            </template>
          </div>
          <span v-if="element.image || element.icon" class="tier-item-name" :class="'name-' + color">{{ element.name }}</span>
          <div class="tier-item-shine"></div>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import draggable from 'vuedraggable'

const props = defineProps({
  label: { type: String, required: true },
  color: { type: String, required: true },
  rarity: { type: String, required: true },
  items: { type: Array, required: true },
  max: { type: Number, default: Infinity },
  poolItems: { type: Array, required: true },
})

const emit = defineEmits(['update'])

const itemClass = computed(() => {
  const map = { gold: 'gold-item', red: 'red-item', purple: 'purple-item' }
  return map[props.color] || 'purple-item'
})

const rowClass = computed(() => {
  const map = { gold: 'gold-row', red: 'red-row', purple: 'purple-row' }
  return map[props.color] || 'purple-row'
})

const onChange = (evt) => {
  if (evt.added) {
    const item = evt.added.element
    const idx = evt.added.newIndex
    // Rarity mismatch: send back to pool
    if (item.rarity !== props.rarity) {
      props.items.splice(idx, 1)
      props.poolItems.push(item)
      return
    }
    // Over capacity: send back to pool
    if (props.items.length > props.max) {
      props.items.splice(idx, 1)
      props.poolItems.push(item)
      return
    }
  }
  emit('update')
}
</script>
