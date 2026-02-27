import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dispatch, onDatabaseInitError, offDatabaseInitError, onModelOperationError, offModelOperationError, clearEventListeners, DB_INIT_ERROR, MODEL_OP_ERROR } from '../events'

beforeEach(() => {
  clearEventListeners()
})

describe('events', () => {
  it('fires onDatabaseInitError callback', () => {
    const cb = vi.fn()
    onDatabaseInitError(cb)
    dispatch(DB_INIT_ERROR, { message: 'fail' })
    expect(cb).toHaveBeenCalledWith({ message: 'fail' })
  })

  it('fires onModelOperationError callback', () => {
    const cb = vi.fn()
    onModelOperationError(cb)
    dispatch(MODEL_OP_ERROR, 'some error')
    expect(cb).toHaveBeenCalledWith('some error')
  })

  it('fires multiple listeners on same event', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    onDatabaseInitError(cb1)
    onDatabaseInitError(cb2)
    dispatch(DB_INIT_ERROR, 'err')
    expect(cb1).toHaveBeenCalled()
    expect(cb2).toHaveBeenCalled()
  })

  it('does not throw when dispatching with no listeners', () => {
    expect(() => dispatch('nonexistent_event', 'data')).not.toThrow()
  })

  it('offDatabaseInitError removes specific listener', () => {
    const cb = vi.fn()
    onDatabaseInitError(cb)
    offDatabaseInitError(cb)
    dispatch(DB_INIT_ERROR, 'err')
    expect(cb).not.toHaveBeenCalled()
  })

  it('offModelOperationError removes specific listener', () => {
    const cb = vi.fn()
    onModelOperationError(cb)
    offModelOperationError(cb)
    dispatch(MODEL_OP_ERROR, 'err')
    expect(cb).not.toHaveBeenCalled()
  })

  it('off only removes the specified listener, others remain', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    onDatabaseInitError(cb1)
    onDatabaseInitError(cb2)
    offDatabaseInitError(cb1)
    dispatch(DB_INIT_ERROR, 'err')
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).toHaveBeenCalledWith('err')
  })

  it('off is a no-op for unregistered callback', () => {
    const cb = vi.fn()
    expect(() => offDatabaseInitError(cb)).not.toThrow()
  })

  it('clearEventListeners removes all listeners for a specific event', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    onDatabaseInitError(cb1)
    onModelOperationError(cb2)
    clearEventListeners(DB_INIT_ERROR)
    dispatch(DB_INIT_ERROR, 'err')
    dispatch(MODEL_OP_ERROR, 'err')
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).toHaveBeenCalled()
  })

  it('clearEventListeners with no arg removes all listeners', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    onDatabaseInitError(cb1)
    onModelOperationError(cb2)
    clearEventListeners()
    dispatch(DB_INIT_ERROR, 'err')
    dispatch(MODEL_OP_ERROR, 'err')
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).not.toHaveBeenCalled()
  })
})
