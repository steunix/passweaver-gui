/**
 * Sanitize HTML tags
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
      const newStr = str.replaceAll(symbol, symbols[symbol])
      return newStr
    }
  }
  return str
}

/**
 * Normalize query object, returning an array
 * @param {any} query Object/string to normalize
 * @returns
 */
export function resolveQuery (query) {
  let el
  if (typeof query === 'string') {
    el = document.querySelectorAll(query)
  } else {
    if (Array.isArray(query)) {
      el = query
    } else {
      el = [query]
    }
  }

  return el
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
 * Wrapper for Element.value getter/setter
 * @param {string} query Query
 * @returns
 */
export function value (query, value) {
  const el = resolveQuery(query)

  if (el === null) {
    return
  }

  if (value === undefined) {
    // Getter, on the first element
    return el[0].value === undefined ? '' : el[0].value
  } else {
    // Setter, on all elements
    for (const e of el) {
      e.value = value
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
    method: 'GET'
  }
  if (payload !== undefined) {
    settings.method = 'POST'
  }
  if (method !== undefined) {
    settings.method = method
  }
  if (payload !== undefined) {
    settings.body = JSON.stringify(payload)
    settings.headers = {
      'Content-Type': 'application/json'
    }
  }

  return await fetch(url, settings)
}

/**
 * Returns element parents
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
