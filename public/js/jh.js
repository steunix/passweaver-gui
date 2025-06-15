/* global NodeList */

/**
 * Sanitize HTML tags in string
 * @param {string} str String to sanitize
 * @returns
 */
export function sanitize (str) {
  if (!str) {
    return ''
  }

  const symbols = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&apos;'
  }
  for (const symbol in symbols) {
    if (str.indexOf(symbol) >= 0) {
      str = str.replaceAll(symbol, symbols[symbol])
    }
  }
  return str
}

/**
 * Normalize query object, returning an array of DOM elements
 * @param {any} query Object/string to normalize
 * @returns
 */
export function resolveQuery (query) {
  if (typeof query === 'string') {
    return document.querySelectorAll(query)
  }

  if (query instanceof NodeList) {
    return query
  }

  if (Array.isArray(query)) {
    return query
  }

  return [query]
}

/**
 * Wrapper for document.querySelector
 * @param {string} query Query
 * @returns
 */
export function query (query) {
  if (!query) {
    return []
  }
  if (typeof query === 'object') {
    return query
  }
  return document.querySelector(query)
}

/**
 * Wrapper for document.querySelectorAll
 * @param {string} query Query
 * @returns
 */
export function queryAll (query) {
  if (!query) {
    return []
  }
  if (typeof query === 'object') {
    return query
  }
  return document.querySelectorAll(query)
}

/**
 * Wrapper for document.addEventListener
 * @param {string} query Query
 * @param {string} event Event
 * @param {function} callback Callback
 * @returns
 */
export function event (query, event, callback) {
  const el = resolveQuery(query)

  if (el === null) {
    return
  }

  for (const e of el) {
    e.addEventListener(event, callback)
  }
}

/**
 * Toggle enabled/disabled state
 * @param {any} query Query
 * @returns
 */
export function toggleEnabled (query, enabled) {
  const el = resolveQuery(query)

  if (el === null) {
    return
  }

  for (const e of el) {
    enabled ? enable(e) : disable(e)
  }
}

/**
 * Enable elements
 * @param {any} query Query
 * @param {boolean} enabled Enable if true, disable if false
 * @returns
 */
export function enable (query, enabled) {
  if (enabled === false) {
    return disable(query)
  }

  const el = resolveQuery(query)

  if (el === null) {
    return
  }

  for (const e of el) {
    e.removeAttribute('disabled')
  }
}

/**
 * Disable elements
 * @param {any} query Query
 * @returns
 */
export function disable (query) {
  const el = resolveQuery(query)

  if (el === null) {
    return
  }

  for (const e of el) {
    e.setAttribute('disabled', true)
  }
}

/**
 * Wrapper for Element.value getter/setter
 * @param {string} query Query
 * @returns
 */
export function value (query, value) {
  const elements = resolveQuery(query)

  if (!elements) {
    return undefined
  }

  if (value === undefined) {
    // Getter, on the first element
    return elements[0]?.value ?? ''
  }

  // Setter, on all elements
  for (const element of elements) {
    element.value = value || ''
  }
}

/**
 * Wrapper for Element.set/getAttribute
 * @param {string} query Query
 * @param {string} attr Attribute
 * @param {string} value Value
 * @returns
 */
export function attribute (query, attr, value) {
  const el = resolveQuery(query)

  if (el === null) {
    return
  }

  if (value === undefined) {
    // Getter, on the first element
    return el[0].getAttribute(attr)
  } else {
    // Setter, on all elements
    for (const e of el) {
      e.setAttribute(attr, value)
    }
  }
}

/**
 * Wrapper for Element.removeAttribute
 * @param {string} query Query
 * @param {string} attr Attribute
 * @returns
 */
export function removeAttribute (query, attr) {
  const el = resolveQuery(query)

  if (el === null) {
    return
  }

  for (const e of el) {
    e.removeAttribute(attr)
  }
}

/**
 * Makes elements draggable
 * @param {string} query Query
 * @param {string} type Item type
 */
export function draggable (query, type) {
  const el = resolveQuery(query)

  if (el === null) {
    return
  }

  if (type === undefined) {
    type = 'default'
  }

  for (const e of el) {
    attribute(e, 'draggable', true)
    event(e, 'dragstart', (ev) => {
      ev.dataTransfer.setData('text/plain', type + ':' + ev.target.getAttribute('data-id'))
    })
  }
}

/**
 * Makes elements a drop target
 * @param {string} query Query
 * @param {function} dropCallback Event called on drop
 */
export function dropTarget (query, dropCallback) {
  const el = resolveQuery(query)

  if (el === null) {
    return
  }

  for (const e of el) {
    event(e, 'dragover', (ev) => {
      ev.preventDefault()
    })
    event(e, 'dragenter', (ev) => {
      ev.target.classList.add('dragover')
      ev.stopPropagation()
    })
    event(e, 'dragleave', (ev) => {
      ev.target.classList.remove('dragover')
    })
    event(e, 'drop', (ev) => {
      ev.stopPropagation()
      ev.target.classList.remove('dragover')
      const data = ev.dataTransfer.getData('text/plain')
      dropCallback(ev, {
        type: data.split(':')[0],
        data: data.split(':')[1]
      })
    })
  }
}

/**
 * Wrapper around fetch
 * @param {string} url
 * @param {object} payload
 * @returns
 */
export async function http (url, payload, method) {
  const settings = {
    method: method || (payload ? 'POST' : 'GET'),
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined
  }

  return await fetch(url, settings)
}

/**
 * Returns and array of parent elements
 * @param {object} el
 * @param {string} selector
 * @returns
 */
export function parents (query, selector) {
  const elems = resolveQuery(query)

  if (elems === null) {
    return
  }

  const parents = []
  for (let el of elems) {
    while ((el = el.parentNode) && el !== document) {
      if (!selector || el.matches(selector)) parents.push(el)
    }
  }
  return parents
}

/**
 * Show elements
 * @param {any} query Query
 * @param {boolean} fshow Show if true, hide if false
 * @returns
 */
export function show (query, fshow) {
  if (fshow === false) {
    return hide(query)
  }

  const el = resolveQuery(query)

  if (el === null) {
    return
  }

  for (const e of el) {
    e.style.display = ''
  }
}

/**
 * Hide elements
 * @param {any} query Query
 * @returns
 */
export function hide (query) {
  const el = resolveQuery(query)

  if (el === null) {
    return
  }

  for (const e of el) {
    e.style.display = 'none'
  }
}
