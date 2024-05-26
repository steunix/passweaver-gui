function jhResolveQuery(query) {
  var el
  if ( typeof query=="string" ) {
    el = document.querySelectorAll(query)
  } else {
    el = query
  }

  return el
}

/**
 * Wrapper for document.querySelector
 * @param {string} query Query
 * @returns
 */
function jhQuery(query) {
  return document.querySelector(query)
}

/**
 * Wrapper for document.querySelectorAll
 * @param {string} query Query
 * @returns
 */
function jhQueryAll(query) {
  return document.querySelectorAll(query)
}

/**
 * Wrapper for document.addEventListener
 * @param {string} query Query
 * @param {string} event Event
 * @param {function} callback Callback
 * @returns
 */
function jhEvent(query,event,callback) {
  const el = jhResolveQuery(query)

  if ( el===null ) {
    return
  }

  for ( const e of el) {
    e.addEventListener(event,callback)
  }
}

/**
 * Wrapper for Element.value getter/setter
 * @param {string} query Query
 * @returns
 */
function jhValue(query, value) {
  const el = jhResolveQuery(query)

  if ( el===null ) {
    return
  }

  if ( value===undefined ) {
    // Getter, on the first element
    return el[0].value === undefined ? '' : el[0].value
  } else {
    // Setter, on all elements
    for ( const e of el) {
      e.value = value
    }
  }
}

/**
 * Wrapper around fetch
 * @param {string} url
 * @param {object} payload
 * @returns
 */
async function jhFetch(url, payload, method) {
  var settings = {
    method: "GET"
  }
  if ( payload!==undefined ) {
    settings.method = "POST"
  }
  if ( method!==undefined ) {
    settings.method = method
  }
  if ( payload!==undefined ) {
    settings.body = JSON.stringify(payload)
    settings.headers = {
      "Content-Type": "application/json"
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
function jhParents(query, selector) {
  var el = jhResolveQuery(query)

  const parents = [];
  while ((el = el.parentNode) && el !== document) {
    if (!selector || el.matches(selector)) parents.push(el);
  }
  return parents;
}