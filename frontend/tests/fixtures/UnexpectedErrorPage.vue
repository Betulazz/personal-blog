<script setup lang="ts">
if (import.meta.server) {
  throw createError({
    statusCode: 500,
    statusMessage: 'fixture-only unexpected error',
  })
}
</script>
