<script setup lang="ts">
// Mesure d'audience : sans identifiant au build, rien n'est chargé. Le script
// ne lit pas le fragment (#t1=…) : la timeline ne lui parvient jamais.
const { rybbitSiteId, rybbitHost } = useRuntimeConfig().public
if (rybbitSiteId)
  useHead({ script: [{ 'src': `${rybbitHost.replace(/\/$/, '')}/api/script.js`, 'defer': true, 'data-site-id': rybbitSiteId }] })
</script>

<template>
  <NuxtPage />
</template>
