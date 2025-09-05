<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h3>Share Live Match</h3>
        <button @click="closeModal" class="btn-close">
          <i class="bi bi-x"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body" v-if="match">
        <div class="match-info">
          <h4>{{ match.player1Name }} vs {{ match.player2Name }}</h4>
          <p class="match-meta">
            {{ match.roundNumber }} • {{ match.matchType }} • {{ match.tournamentLevel }}
          </p>
        </div>

        <!-- Share Options -->
        <div class="share-section">
          <h5>Share Options</h5>
          
          <!-- Live URL -->
          <div class="share-option">
            <label>Live Match URL</label>
            <div class="url-input-group">
              <input
                ref="liveUrlInput"
                :value="liveUrl"
                readonly
                class="form-control"
                placeholder="Loading..."
              />
              <button
                @click="copyToClipboard(liveUrl, 'Live URL')"
                class="btn btn-outline-primary"
                :disabled="!liveUrl"
              >
                <i class="bi bi-copy"></i>
                Copy
              </button>
            </div>
            <small class="form-text">Direct link to watch this live match</small>
          </div>

          <!-- Spectator URL -->
          <div class="share-option">
            <label>Spectator URL</label>
            <div class="url-input-group">
              <input
                ref="spectatorUrlInput"
                :value="spectatorUrl"
                readonly
                class="form-control"
                placeholder="Loading..."
              />
              <button
                @click="copyToClipboard(spectatorUrl, 'Spectator URL')"
                class="btn btn-outline-primary"
                :disabled="!spectatorUrl"
              >
                <i class="bi bi-copy"></i>
                Copy
              </button>
            </div>
            <small class="form-text">View-only link for spectators</small>
          </div>

          <!-- QR Code -->
          <div class="share-option">
            <label>QR Code</label>
            <div class="qr-code-container">
              <canvas
                ref="qrCanvas"
                width="200"
                height="200"
                class="qr-code"
              ></canvas>
              <div class="qr-actions">
                <button
                  @click="downloadQR"
                  class="btn btn-outline-secondary"
                  :disabled="!qrGenerated"
                >
                  <i class="bi bi-download"></i>
                  Download QR
                </button>
              </div>
            </div>
            <small class="form-text">Scan to access live match</small>
          </div>
        </div>

        <!-- Social Share -->
        <div class="share-section">
          <h5>Social Media</h5>
          <div class="social-buttons">
            <button
              @click="shareOnTwitter"
              class="btn btn-twitter"
              :disabled="!liveUrl"
            >
              <i class="bi bi-twitter"></i>
              Twitter
            </button>
            <button
              @click="shareOnFacebook"
              class="btn btn-facebook"
              :disabled="!liveUrl"
            >
              <i class="bi bi-facebook"></i>
              Facebook
            </button>
            <button
              @click="shareViaEmail"
              class="btn btn-email"
              :disabled="!liveUrl"
            >
              <i class="bi bi-envelope"></i>
              Email
            </button>
            <button
              @click="shareViaWhatsApp"
              class="btn btn-whatsapp"
              :disabled="!liveUrl"
            >
              <i class="bi bi-whatsapp"></i>
              WhatsApp
            </button>
          </div>
        </div>

        <!-- Embed Code -->
        <div class="share-section">
          <h5>Embed Code</h5>
          <div class="embed-option">
            <label>HTML Embed</label>
            <textarea
              ref="embedCodeInput"
              :value="embedCode"
              readonly
              class="form-control embed-textarea"
              rows="4"
            ></textarea>
            <div class="embed-actions">
              <button
                @click="copyToClipboard(embedCode, 'Embed code')"
                class="btn btn-outline-primary"
                :disabled="!embedCode"
              >
                <i class="bi bi-copy"></i>
                Copy Embed Code
              </button>
            </div>
            <small class="form-text">Use this code to embed the live match on your website</small>
          </div>
        </div>

        <!-- Copy Success Message -->
        <div v-if="copySuccess" class="copy-success">
          <i class="bi bi-check-circle"></i>
          {{ copySuccess }}
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button type="button" @click="closeModal" class="btn btn-secondary">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import type { Match } from '@/types/match'

interface Props {
  show: boolean
  match: Match | null
  liveUrl: string
}

interface Emits {
  (e: 'update:show', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Template refs
const qrCanvas = ref<HTMLCanvasElement>()
const liveUrlInput = ref<HTMLInputElement>()
const spectatorUrlInput = ref<HTMLInputElement>()
const embedCodeInput = ref<HTMLTextAreaElement>()

// State
const qrGenerated = ref(false)
const copySuccess = ref('')

// Computed
const showModal = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value)
})

const spectatorUrl = computed(() => {
  if (!props.liveUrl) return ''
  return `${props.liveUrl}?spectator=true`
})

const embedCode = computed(() => {
  if (!props.liveUrl) return ''
  return `<iframe src="${props.liveUrl}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`
})

const shareText = computed(() => {
  if (!props.match) return ''
  return `Watch live: ${props.match.player1Name} vs ${props.match.player2Name} - ${props.match.roundNumber}`
})

// Methods
const closeModal = () => {
  showModal.value = false
  copySuccess.value = ''
}

const copyToClipboard = async (text: string, type: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copySuccess.value = `${type} copied to clipboard!`
    setTimeout(() => {
      copySuccess.value = ''
    }, 3000)
  } catch (err) {
    console.error('Failed to copy:', err)
    // Fallback for older browsers
    fallbackCopyToClipboard(text, type)
  }
}

const fallbackCopyToClipboard = (text: string, type: string) => {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  
  try {
    document.execCommand('copy')
    copySuccess.value = `${type} copied to clipboard!`
    setTimeout(() => {
      copySuccess.value = ''
    }, 3000)
  } catch (err) {
    console.error('Fallback copy failed:', err)
  }
  
  document.body.removeChild(textArea)
}

const generateQR = async () => {
  if (!qrCanvas.value || !props.liveUrl) return
  
  try {
    // For a real implementation, you'd use a QR code library like qrcode
    // For now, we'll create a simple placeholder
    const canvas = qrCanvas.value
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw placeholder QR code pattern
      ctx.fillStyle = '#000000'
      
      // Draw corners
      for (let i = 0; i < 3; i++) {
        const x = i === 2 ? 150 : 20
        const y = i === 1 ? 150 : 20
        
        // Outer square
        ctx.fillRect(x, y, 30, 30)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x + 5, y + 5, 20, 20)
        ctx.fillStyle = '#000000'
        ctx.fillRect(x + 10, y + 10, 10, 10)
      }
      
      // Draw some data pattern
      ctx.fillStyle = '#000000'
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
          if ((i + j) % 3 === 0) {
            ctx.fillRect(60 + i * 5, 60 + j * 5, 4, 4)
          }
        }
      }
      
      qrGenerated.value = true
    }
  } catch (err) {
    console.error('QR generation failed:', err)
  }
}

const downloadQR = () => {
  if (!qrCanvas.value) return
  
  const link = document.createElement('a')
  link.download = `live-match-qr-${Date.now()}.png`
  link.href = qrCanvas.value.toDataURL()
  link.click()
}

const shareOnTwitter = () => {
  const text = encodeURIComponent(shareText.value)
  const url = encodeURIComponent(props.liveUrl)
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
}

const shareOnFacebook = () => {
  const url = encodeURIComponent(props.liveUrl)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
}

const shareViaEmail = () => {
  const subject = encodeURIComponent(shareText.value)
  const body = encodeURIComponent(`Check out this live match: ${props.liveUrl}`)
  window.location.href = `mailto:?subject=${subject}&body=${body}`
}

const shareViaWhatsApp = () => {
  const text = encodeURIComponent(`${shareText.value} ${props.liveUrl}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}

// Lifecycle
onMounted(() => {
  nextTick(() => {
    generateQR()
  })
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  color: #1e293b;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.modal-body {
  padding: 2rem;
}

.match-info {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.match-info h4 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-weight: 600;
}

.match-meta {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.share-section {
  margin-bottom: 2rem;
}

.share-section h5 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-weight: 600;
  font-size: 1.1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.share-option {
  margin-bottom: 1.5rem;
}

.share-option label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 500;
}

.url-input-group {
  display: flex;
  gap: 0.5rem;
}

.form-control {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.875rem;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.embed-textarea {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.875rem;
  resize: vertical;
}

.embed-option {
  margin-bottom: 1rem;
}

.embed-actions {
  margin-top: 0.5rem;
}

.form-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.qr-code-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.qr-code {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
}

.qr-actions {
  display: flex;
  gap: 0.5rem;
}

.social-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.copy-success {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #dcfce7;
  border: 1px solid #bbf7d0;
  color: #166534;
  border-radius: 6px;
  margin-top: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  justify-content: center;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-outline-primary {
  background: transparent;
  color: #3b82f6;
  border: 1px solid #3b82f6;
}

.btn-outline-primary:hover:not(:disabled) {
  background: #3b82f6;
  color: white;
}

.btn-outline-secondary {
  background: transparent;
  color: #64748b;
  border: 1px solid #d1d5db;
}

.btn-outline-secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-twitter {
  background: #1da1f2;
  color: white;
}

.btn-twitter:hover:not(:disabled) {
  background: #1a91da;
}

.btn-facebook {
  background: #1877f2;
  color: white;
}

.btn-facebook:hover:not(:disabled) {
  background: #166fe5;
}

.btn-email {
  background: #6b7280;
  color: white;
}

.btn-email:hover:not(:disabled) {
  background: #4b5563;
}

.btn-whatsapp {
  background: #25d366;
  color: white;
}

.btn-whatsapp:hover:not(:disabled) {
  background: #22c55e;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .modal-content {
    margin: 0.5rem;
    max-height: 95vh;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }
  
  .url-input-group {
    flex-direction: column;
  }
  
  .social-buttons {
    grid-template-columns: 1fr;
  }
}
</style>