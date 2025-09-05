<template>
  <Select v-model="selectedCounty" @update:modelValue="handleCountyChange">
    <option value="" disabled>Select a county</option>
    <option v-for="county in kenyanCounties" :key="county" :value="county">
      {{ county }}
    </option>
  </Select>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Select from '@/components/ui/select.vue'

interface Props {
  modelValue: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select a county'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const kenyanCounties = [
  'Mombasa',
  'Kwale', 
  'Kilifi',
  'Tana River',
  'Lamu',
  'Taita-Taveta',
  'Garissa',
  'Wajir',
  'Mandera',
  'Marsabit',
  'Isiolo',
  'Meru',
  'Tharaka-Nithi',
  'Embu',
  'Kitui',
  'Machakos',
  'Makueni',
  'Nyandarua',
  'Nyeri',
  'Kirinyaga',
  'Murang\'a',
  'Kiambu',
  'Turkana',
  'West Pokot',
  'Samburu',
  'Trans Nzoia',
  'Uasin Gishu',
  'Elgeyo-Marakwet',
  'Nandi',
  'Baringo',
  'Laikipia',
  'Nakuru',
  'Narok',
  'Kajiado',
  'Kericho',
  'Bomet',
  'Kakamega',
  'Vihiga',
  'Bungoma',
  'Busia',
  'Siaya',
  'Kisumu',
  'Homa Bay',
  'Migori',
  'Kisii',
  'Nyamira',
  'Nairobi'
]

const selectedCounty = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleCountyChange = (value: string) => {
  emit('update:modelValue', value)
}
</script>