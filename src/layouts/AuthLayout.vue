<template>
  <div class="min-h-screen">
    <!-- Header -->
    <header class="border-b">
      <div class="container mx-auto px-4 py-4">
        <nav class="flex items-center justify-between">
          <!-- Logo -->
          <router-link to="/" class="flex items-center space-x-2">
            <div class="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap class="h-5 w-5 text-primary-foreground" />
            </div>
            <span class="text-xl font-bold">CueSport Community</span>
          </router-link>

          <!-- Navigation -->
          <div class="flex items-center space-x-4">
            <Button variant="ghost" as-child>
              <router-link to="/">Home</router-link>
            </Button>
            <Button variant="ghost" as-child>
              <router-link to="/about">About</router-link>
            </Button>
            <Separator orientation="vertical" class="h-6" />
            <Button 
              v-if="$route.name !== 'login'"
              variant="ghost" 
              as-child
            >
              <router-link to="/login">Sign in</router-link>
            </Button>
            <Button 
              v-if="$route.name !== 'signup'"
              as-child
            >
              <router-link to="/signup">Get Started</router-link>
            </Button>
          </div>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-12">
      <div class="mx-auto max-w-md">
        <Card>
          <CardContent class="p-6">
            <slot />
          </CardContent>
        </Card>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t mt-auto">
      <div class="container mx-auto px-4 py-8">
        <div class="text-center text-sm text-muted-foreground">
          <p>&copy; 2024 CueSport Community. All rights reserved.</p>
          <div class="mt-2 flex items-center justify-center space-x-4">
            <Button variant="link" size="sm" as-child>
              <a href="#">Privacy Policy</a>
            </Button>
            <span>•</span>
            <Button variant="link" size="sm" as-child>
              <a href="#">Terms of Service</a>
            </Button>
            <span>•</span>
            <Button variant="link" size="sm" as-child>
              <a href="#">Contact</a>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Zap } from 'lucide-vue-next'

const route = useRoute()
</script>