import { describe, it, expect, vi } from 'vitest'
import { dispatch, onDatabaseInitError, onModelOperationError, DB_INIT_ERROR, MODEL_OP_ERROR } from '../events'

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
})
