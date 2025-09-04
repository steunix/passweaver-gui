/* global NodeList, Image */

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

  for (const e of el) {
    if (e) {
      e.addEventListener(event, callback)
    }
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

  for (const e of el) {
    if (e) {
      e.removeAttribute('disabled')
    }
  }
}

/**
 * Disable elements
 * @param {any} query Query
 * @returns
 */
export function disable (query) {
  const el = resolveQuery(query)

  for (const e of el) {
    if (e) {
      e.setAttribute('disabled', 'disabled')
    }
  }
}

/**
 * Wrapper for Element.value getter/setter
 * @param {string} query Query
 * @returns
 */
export function value (query, value) {
  const elements = resolveQuery(query)

  // Setter, on all elements
  for (const element of elements) {
    // Getter, return value of the first element
    if (value === undefined) {
      return element?.value ?? ''
    }
    if (element) {
      element.value = value
    }
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

  // Setter, on all elements
  for (const e of el) {
    // Getter, return attribute of the first element
    if (value === undefined) {
      return e.getAttribute(attr)
    }
    if (e) {
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

  for (const e of el) {
    if (e) {
      e.removeAttribute(attr)
    }
  }
}

/**
 * Makes elements draggable
 * @param {string} query Query
 * @param {string} type Item type
 */
export function draggable (query, type) {
  const el = resolveQuery(query)

  if (type === undefined) {
    type = 'default'
  }

  const img = new Image()
  if (type === 'item') {
    img.src = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBMaWNlbnNlOiBNSVQuIE1hZGUgYnkgSWNvbnNheDogaHR0cHM6Ly9naXRodWIuY29tL2x1c2F4d2ViL2ljb25zYXggLS0+Cjxzdmcgd2lkdGg9IjUwcHgiIGhlaWdodD0iNTBweCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZyBvcGFjaXR5PSIwLjQiPgo8cGF0aCBkPSJNMiA4LjUwNDg4SDIyIiBzdHJva2U9IiMyOTJEMzIiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNNiAxNi41MDQ5SDgiIHN0cm9rZT0iIzI5MkQzMiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMC41IDE2LjUwNDlIMTQuNSIgc3Ryb2tlPSIjMjkyRDMyIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9nPgo8cGF0aCBkPSJNNi40NCAzLjUwNDg4SDE3LjU1QzIxLjExIDMuNTA0ODggMjIgNC4zODQ4OCAyMiA3Ljg5NDg4VjE2LjEwNDlDMjIgMTkuNjE0OSAyMS4xMSAyMC40OTQ5IDE3LjU2IDIwLjQ5NDlINi40NEMyLjg5IDIwLjUwNDkgMiAxOS42MjQ5IDIgMTYuMTE0OVY3Ljg5NDg4QzIgNC4zODQ4OCAyLjg5IDMuNTA0ODggNi40NCAzLjUwNDg4WiIgc3Ryb2tlPSIjMjkyRDMyIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPg=='
  }
  if (type === 'folder') {
    img.src = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBMaWNlbnNlOiBNSVQuIE1hZGUgYnkgdGVlbnlpY29uczogaHR0cHM6Ly9naXRodWIuY29tL3RlZW55aWNvbnMvdGVlbnlpY29ucyAtLT4KPHN2ZyB3aWR0aD0iNTBweCIgaGVpZ2h0PSI1MHB4IiB2aWV3Qm94PSIwIDAgMTUgMTUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0wLjUgMTIuNVYyLjVDMC41IDEuOTQ3NzIgMC45NDc3MTUgMS41IDEuNSAxLjVINS41TDcuNSAzLjVIMTMuNUMxNC4wNTIzIDMuNSAxNC41IDMuOTQ3NzIgMTQuNSA0LjVWMTIuNUMxNC41IDEzLjA1MjMgMTQuMDUyMyAxMy41IDEzLjUgMTMuNUgxLjVDMC45NDc3MTUgMTMuNSAwLjUgMTMuMDUyMyAwLjUgMTIuNVoiIHN0cm9rZT0iIzAwMDAwMCIvPgo8L3N2Zz4='
  }

  for (const e of el) {
    if (e) {
      attribute(e, 'draggable', true)
      event(e, 'dragstart', (ev) => {
        ev.dataTransfer.setDragImage(img, 0, 0)
        ev.dataTransfer.setData('text/plain', type + ':' + ev.target.getAttribute('data-id'))
      })
    }
  }
}

/**
 * Makes elements a drop target
 * @param {string} query Query
 * @param {function} dropCallback Event called on drop
 */
export function dropTarget (query, dropCallback) {
  const el = resolveQuery(query)

  for (const e of el) {
    if (e) {
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

  const parents = []
  for (let el of elems) {
    if (el) {
      while ((el = el.parentNode) && el !== document) {
        if (!selector || el.matches(selector)) parents.push(el)
      }
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

  for (const e of el) {
    if (e) {
      e.style.display = ''
    }
  }
}

/**
 * Hide elements
 * @param {any} query Query
 * @returns
 */
export function hide (query) {
  const el = resolveQuery(query)

  for (const e of el) {
    if (e) {
      e.style.display = 'none'
    }
  }
}
