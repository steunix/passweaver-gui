function jshResolveQuery(query) {
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
function jshQS(query) {
  return document.querySelector(query)
}

/**
 * Wrapper for document.querySelectorAll
 * @param {string} query Query
 * @returns
 */
function jshQSA(query) {
  return document.querySelectorAll(query)
}

/**
 * Wrapper for document.addEventListener
 * @param {string} query Query
 * @param {string} event Event
 * @param {function} callback Callback
 * @returns
 */
function jshAddEventListener(query,event,callback) {
  const el = jshResolveQuery(query)

  if ( el===null ) {
    return
  }

  for ( e of el) {
    e.addEventListener(event,callback)
  }
}

/**
 * Wrapper for Element.value getter/setter
 * @param {string} query Query
 * @returns
 */
function jshValue(query, value) {
  const el = jshResolveQuery(query)

  if ( el===null ) {
    return
  }

  if ( value===undefined ) {
    // Getter, on the first element
    return el[0].value
  } else {
    // Setter, on all elements
    for ( e of el) {
      e.value = value
    }
  }
}

async function jshFetch(url, payload) {
  var settings = {
    method: "GET"
  }
  if ( payload!==undefined ) {
    settings.method = "POST"
    settings.body = JSON.stringify(payload)
    settings.headers = {
      "Content-Type": "application/json"
    }
  }

  return await fetch(url, settings)
}