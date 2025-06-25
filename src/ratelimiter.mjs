/**
 * Rate limiter module
 * @module src/ratelimiter
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { rateLimit } from 'express-rate-limit'
import * as Config from './config.mjs'

// Rate limit middleware
const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Config.get().server.rate_limit_max_requests,
  message: 'Rate limit exceeded',
  headers: true
})

export default rateLimitMiddleware
