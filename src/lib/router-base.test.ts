import { describe, expect, it } from 'vitest'
import { routerBasename } from './router-base'

describe('routerBasename', () => {
  it('keeps root base as /', () => {
    expect(routerBasename('/')).toBe('/')
  })

  it('strips the trailing slash from a project Pages path', () => {
    expect(routerBasename('/habits/')).toBe('/habits')
  })
})
