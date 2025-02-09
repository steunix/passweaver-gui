/**
 * Rate limiter module
 * @module src/random
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { rateLimit } from 'express-rate-limit'

// Rate limit middleware
const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Rate limit exceeded',
  headers: true
})

export default rateLimitMiddleware
