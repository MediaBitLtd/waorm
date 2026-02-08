export const DB_INIT_ERROR = 'database_initialization_error'
export const MODEL_OP_ERROR = 'model_operation_error'

const eventListeners: { [k: string]: ((context?: any) => void) [] } = {}

const setupEventListener = (event: string, callback: () => void) => {
  if (! eventListeners[event]) {
    eventListeners[event] = []
  }

  eventListeners[event].push(callback)
}

export const dispatch = (event: string, context?: any) => {
  const listeners = eventListeners[event]
  if (listeners) {
    listeners.forEach(handler => handler(context))
  }
}

export const onDatabaseInitError = (callback: (context?: any) => void) => setupEventListener(DB_INIT_ERROR, callback)
export const onModelOperationError = (callback: (context?: any) => void) => setupEventListener(MODEL_OP_ERROR, callback)
