<template>
  <div class="pool-section">
    <div class="tier-list">
      <draggable
        :list="items"
        :group="{ name: 'items', pull: true, put: true }"
        item-key="id"
        :animation="200"
        ghost-class="ghost"
        chosen-class="chosen"
        class="pool-grid"
        :class="{ 'pool-grid-text': textOnly }"
        @change="onChange"
      >
        <template #item="{ element }">
          <div class="pool-item" :class="[itemClass, { 'pool-item-text': textOnly }]">
            <template v-if="element.image">
              <div class="pool-item-icon">
                <img :src="element.image" :alt="element.name" />
                <div class="pool-item-shine"></div>
              </div>
            </template>
            <template v-else-if="element.icon && !textOnly">
              <div class="pool-item-icon">
                <span class="p-icon">{{ element.icon }}</span>
                <div class="pool-item-shine"></div>
              </div>
            </template>
            <span class="p-name" :class="['name-' + rarityColor, { 'p-name-only': textOnly }]">{{ element.name }}</span>
          </div>
        </template>
      </draggable>

      <div v-if="items.length === 0" class="pool-empty-row">
        已全部分配
      </div>
    </div>
  </div>
</template>

<script setup>
import draggable from 'vuedraggable'

const props = defineProps({
  title: { type: String, required: true },
  dotColor: { type: String, default: '#888' },
  titleColor: { type: String, default: '#888' },
  items: { type: Array, required: true },
  itemClass: { type: String, default: '' },
  rarityColor: { type: String, default: 'purple' },
  textOnly: { type: Boolean, default: false },
})

const emit = defineEmits(['update'])

const onChange = () => {
  emit('update')
}
</script>
