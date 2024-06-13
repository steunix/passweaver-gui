function jhResolveQuery(query) {
  var el
  if ( typeof query=="string" ) {
    el = document.querySelectorAll(query)
  } else {
    el = [query]
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
 * Wrapper for Element.set/getAttribute
 * @param {string} query Query
 * @param {string} attr Attribute
 * @param {string} value Value
 * @returns
 */
function jhAttribute(query, attr, value) {
  const el = jhResolveQuery(query)

  if ( el===null ) {
    return
  }

  if ( value===undefined ) {
    // Getter, on the first element
    return el[0].getAttribute(attr)
  } else {
    // Setter, on all elements
    for ( const e of el) {
      e.setAttribute(attr, value)
    }
  }
}

/**
 * Makes elements draggable
 * @param {string} query Query
 * @param {string} type Item type
 */
function jhDraggable(query,type) {
  const el = jhResolveQuery(query)

  if ( type===undefined ) {
    type = "default"
  }

  if ( el===null ) {
    return
  }

  for ( const e of el) {
    jhAttribute(e, "draggable", true)
    jhEvent(e, "dragstart", (ev)=>{
      ev.dataTransfer.setData("text/plain", type+":"+ev.target.getAttribute("data-id"))
    })
  }
}

/**
 * Makes elements a drop target
 * @param {string} query Query
 * @param {function} dropCallback Event called on drop
 */
function jhDropTarget(query, dropCallback) {
  const el = jhResolveQuery(query)

  if ( el===null ) {
    return
  }

  for ( const e of el) {
    jhEvent(e, "dragover", (ev)=>{
      ev.preventDefault()
    })
    jhEvent(e, "dragenter", (ev)=>{
      ev.target.classList.add("dragover")
      ev.stopPropagation()
    })
    jhEvent(e, "dragleave", (ev)=>{
      ev.target.classList.remove("dragover")
    })
    jhEvent(e, "drop", (ev)=> {
      ev.stopPropagation()
      ev.target.classList.remove("dragover")
      const data = ev.dataTransfer.getData('text/plain')
      dropCallback(ev, {
        type: data.split(":")[0],
        data: data.split(":")[1]
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
  var elems = jhResolveQuery(query)

  const parents = [];
  for ( el of elems ) {
    while ((el = el.parentNode) && el !== document) {
      if (!selector || el.matches(selector)) parents.push(el);
    }
  }
  return parents;
}