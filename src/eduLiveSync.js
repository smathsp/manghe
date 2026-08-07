const CHANNEL_NAME = 'manghe-edu-live-review-v1'
const STORAGE_EVENT_KEY = '__manghe_edu_live_event__'

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function createEduLiveSync(onMessage) {
  const senderId = randomId()
  const seen = new Set()
  const channel = typeof BroadcastChannel === 'function'
    ? new BroadcastChannel(CHANNEL_NAME)
    : null

  function receive(envelope) {
    if (!envelope?.id || envelope.senderId === senderId || seen.has(envelope.id)) return
    seen.add(envelope.id)
    if (seen.size > 100) seen.delete(seen.values().next().value)
    onMessage?.(envelope)
  }

  function onStorage(event) {
    if (event.key !== STORAGE_EVENT_KEY || !event.newValue) return
    try {
      receive(JSON.parse(event.newValue))
    } catch {
      // Ignore malformed cross-window messages.
    }
  }

  channel?.addEventListener('message', (event) => receive(event.data))
  window.addEventListener('storage', onStorage)

  function send(type, payload = null) {
    const envelope = {
      id: randomId(),
      senderId,
      type,
      payload,
      sentAt: Date.now(),
    }
    channel?.postMessage(envelope)
    try {
      window.localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(envelope))
      window.localStorage.removeItem(STORAGE_EVENT_KEY)
    } catch {
      // BroadcastChannel remains the primary transport.
    }
  }

  function close() {
    channel?.close()
    window.removeEventListener('storage', onStorage)
  }

  return { send, close }
}
