<template>
  <header class="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-4 sm:px-8">
    <NuxtLink to="/" class="flex items-center gap-2 rounded-lg py-1 text-[17px] font-semibold focus-visible:outline-2 focus-visible:outline-accent">
      <BrandMark class="size-7" />
      Timeline
    </NuxtLink>
    <nav class="ml-auto flex items-center gap-1" aria-label="Site">
      <NuxtLink to="/#exemples" class="btn btn-quiet max-sm:hidden">Exemples</NuxtLink>
      <NuxtLink to="/editeur" class="btn">Ouvrir l'éditeur</NuxtLink>
    </nav>
  </header>
</template>
