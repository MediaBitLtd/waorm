export const DB_INIT_ERROR = 'database_initialization_error'
export const MODEL_OP_ERROR = 'model_operation_error'

export type WaormEventCallback = (context?: any) => void

const eventListeners: { [k: string]: WaormEventCallback[] } = {}

const setupEventListener = (event: string, callback: WaormEventCallback) => {
  if (! eventListeners[event]) {
    eventListeners[event] = []
  }

  eventListeners[event].push(callback)
}

const removeEventListener = (event: string, callback: WaormEventCallback) => {
  if (! eventListeners[event]) {
    return
  }

  const idx = eventListeners[event].indexOf(callback)

  if (idx !== -1) {
    eventListeners[event].splice(idx, 1)
  }
}

export const clearEventListeners = (event?: string) => {
  if (event) {
    delete eventListeners[event]
    return
  }

  for (const k in eventListeners) {
    delete eventListeners[k]
  }
}

export const dispatch = (event: string, context?: any) => {
  const listeners = eventListeners[event]
  if (listeners) {
    listeners.forEach(handler => handler(context))
  }
}

export const onDatabaseInitError = (callback: WaormEventCallback) => setupEventListener(DB_INIT_ERROR, callback)
export const offDatabaseInitError = (callback: WaormEventCallback) => removeEventListener(DB_INIT_ERROR, callback)

export const onModelOperationError = (callback: WaormEventCallback) => setupEventListener(MODEL_OP_ERROR, callback)
export const offModelOperationError = (callback: WaormEventCallback) => removeEventListener(MODEL_OP_ERROR, callback)
