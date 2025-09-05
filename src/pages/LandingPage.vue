<template>
  <div class="min-h-screen bg-white flex flex-col">
    <!-- Navbar -->
    <nav class="w-full flex items-center justify-between px-8 py-4 border-b bg-white">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">C</div>
        <span class="text-2xl font-bold text-gray-900 tracking-tight">Cuesport<span class="text-red-500">.</span></span>
      </div>
      <div class="hidden md:flex gap-8 text-sm font-medium text-gray-700">
        <a href="#features" class="hover:text-red-500 transition">Features</a>
        <a href="#how" class="hover:text-red-500 transition">How It Works</a>
        <a href="#pricing" class="hover:text-red-500 transition">Pricing</a>
        <a href="#faq" class="hover:text-red-500 transition">FAQ</a>
      </div>
      <div class="flex gap-2">
        <RouterLink to="/login">
          <Button variant="ghost" class="text-red-500 hover:text-red-600">
            Login
          </Button>
        </RouterLink>
        <RouterLink to="/signup">
          <Button class="bg-red-500 hover:bg-red-600">
            Sign Up
          </Button>
        </RouterLink>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="flex flex-col-reverse md:flex-row items-center justify-between flex-1 px-8 py-12 max-w-7xl mx-auto w-full gap-8">
      <div class="flex-1 flex flex-col items-start justify-center">
        <h1 class="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
          Crystal Clear View,<br />
          Night Vision, Smart Motion
        </h1>
        <p class="text-base md:text-lg text-gray-600 mb-6 max-w-md">
          Cuesport portal is a social instrument for managing, connecting, and growing your cuesport community. Tools for leaders and members, all in one place.
        </p>
        <RouterLink to="/signup">
          <Button size="lg" class="bg-red-500 hover:bg-red-600 h-12 px-6 text-lg">
            Get Started
          </Button>
        </RouterLink>
      </div>
      <div class="flex-1 flex justify-center items-center">
        <img src="https://www.samsung.com/etc/designs/smg/global/imgs/support/cont/NO_IMAGE_600x600.png" alt="Product" class="w-80 h-80 object-contain drop-shadow-lg" />
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="bg-gray-50 py-12">
      <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 px-8">
        <Card class="text-center hover:shadow-lg transition-shadow">
          <CardContent class="p-6">
            <Camera class="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 class="font-semibold text-lg mb-2">Community Visibility</h3>
            <p class="text-gray-500 text-sm">High definition clarity for all your community events and matches.</p>
          </CardContent>
        </Card>
        <Card class="text-center hover:shadow-lg transition-shadow">
          <CardContent class="p-6">
            <Zap class="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 class="font-semibold text-lg mb-2">Fast Management</h3>
            <p class="text-gray-500 text-sm">Never miss a moment with ultra-fast event and member management tools.</p>
          </CardContent>
        </Card>
        <Card class="text-center hover:shadow-lg transition-shadow">
          <CardContent class="p-6">
            <Settings class="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 class="font-semibold text-lg mb-2">Powerful Control Panel</h3>
            <p class="text-gray-500 text-sm">Admin dashboard for leaders to manage everything efficiently.</p>
          </CardContent>
        </Card>
        <Card class="text-center hover:shadow-lg transition-shadow">
          <CardContent class="p-6">
            <Heart class="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 class="font-semibold text-lg mb-2">Healthy Community Life</h3>
            <p class="text-gray-500 text-sm">Keep your community engaged and active with built-in communication tools.</p>
          </CardContent>
        </Card>
      </div>
    </section>

    <footer class="text-center text-xs text-gray-400 py-4 border-t">
      &copy; {{ new Date().getFullYear() }} Cuesport Community. All rights reserved.
    </footer>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Zap, Settings, Heart } from 'lucide-vue-next'
</script>
