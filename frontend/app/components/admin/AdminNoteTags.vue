<script setup lang="ts">
import type { AdminTaxonomy } from '~/types/admin'
defineProps<{ tags: AdminTaxonomy[] }>()
const selected = defineModel<number[]>({ required: true })
</script>

<template>
  <fieldset class="admin-note-tags">
    <legend>标签（最多 20 个）</legend>
    <label v-for="tag in tags" :key="tag.id"
      ><input
        v-model="selected"
        type="checkbox"
        :value="Number(tag.id)"
        :disabled="selected.length >= 20 && !selected.includes(Number(tag.id))"
      />{{ tag.name }}</label
    >
    <p v-if="!tags.length">暂无标签，可先到标签管理中创建。</p>
  </fieldset>
</template>
