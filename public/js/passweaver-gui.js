/* global dispatchEvent, DOMParser, localStorage */

import * as JH from './jh.js'
import * as SB from './searchbox.js'

const itemFound = new Event('pw-item-found')

export function setTableLoading (selector) {
  JH.query(selector).querySelector('tbody').innerHTML =
    "<tr><td colspan='99'><sl-skeleton effect='pulse'></sl-skeleton></td></tr>"
}

export function setTreeviewLoading (selector) {
  JH.query(`${selector}`).innerHTML =
    '<sl-tree-item>Loading...</sl-tree-item>'
}

export function confirmDialog (title, text, callback, savetext, savevariant) {
  const dialog = JH.query('#confirmdialog')
  dialog.setAttribute('label', title)

  JH.query('#confirmok').replaceWith(JH.query('#confirmok').cloneNode(true))

  JH.query('#confirmok').innerHTML = 'Confirm'
  JH.query('#confirmok').setAttribute('variant', 'primary')

  JH.query('#confirmdialogtext').innerHTML = text

  if (savetext !== undefined) {
    JH.query('#confirmok').innerHTML = savetext
  }
  if (savevariant !== undefined) {
    JH.query('#confirmok').setAttribute('variant', savevariant)
  }
  JH.event('#confirmok', 'click', event => {
    dialog.hide()
    callback()
  })

  JH.query('#confirmcancel').replaceWith(JH.query('#confirmcancel').cloneNode(true))
  JH.event('#confirmcancel', 'click', event => {
    dialog.hide()
  })
  dialog.addEventListener('sl-request-close', event => {
    if (event.detail.source === 'overlay') {
      event.preventDefault()
    }
  })
  dialog.show()
}

export function errorDialog (text, subject) {
  const dialog = JH.query('#errordialog')
  JH.query('#errordialogtext').innerHTML = text

  JH.query('#errordialog').setAttribute('label', subject || 'PassWeaver')
  JH.query('#errordialogclose').replaceWith(JH.query('#errordialogclose').cloneNode(true))
  JH.event('#errordialogclose', 'click', event => {
    dialog.hide()
  })
  dialog.show()
}

export async function checkResponse (resp, ignoreStatus) {
  const respClone = resp.clone()
  let body
  try {
    body = await respClone.json()
  } catch (err) {
    errorDialog('Internal error: bad request to PassWeaver GUI')
    return
  }

  const ignore = typeof ignoreStatus === 'object' ? ignoreStatus : [ignoreStatus]
  if (body.status === 'success') {
    return true
  }
  if (body.status === 'failed' && body.httpStatusCode === 404) {
    return true
  }
  if (body.status === 'failed' && ignoreStatus && ignore.includes(body.httpStatusCode)) {
    return true
  }

  if (body.status === 'failed' && body.fatal) {
    window.location = '/logout?error=' + encodeURIComponent(body.message)
    return
  }

  errorDialog(body.message)
}

export async function treeFill (id, data, callback, uselocalstorage) {
  JH.query(`#${id}`).innerHTML = ''
  treeFillItems(id, data, null)

  if (!JH.attribute(`#${id}`, 'evt-sl-selection-change')) {
    JH.event(`#${id}`, 'sl-selection-change', (ev) => {
      const sel = JH.query('sl-tree-item[selected]')
      const id = sel.getAttribute('data-id')
      callback(id)

      // Save last item
      const user = getUser()
      const lskey = `${user}_${ev.target.id}_selected`
      localStorage.setItem(lskey, sel.id)
    })
    JH.attribute(`#${id}`, 'evt-sl-selection-change', '1')
  }

  const user = getUser()
  const last = localStorage.getItem(`${user}_${id}_selected`)
  if (uselocalstorage && last) {
    // Select last item
    const lastelem = JH.query(`#${last}`)
    if (lastelem) {
      lastelem.setAttribute('selected', 'selected')
      setTimeout(() => {
        lastelem.scrollIntoView()
      }, 500)
      callback()
    }
  }
}

export function treeFillItems (id, data, mainid) {
  const user = getUser()

  const parent = JH.query(`#${id}`)
  const root = mainid || id

  for (const item of data) {
    const newid = `item-${item.id}`

    const lskey = `${user}_${root}_expanded_${newid}`
    let props = ''
    if (localStorage.getItem(lskey) === '1') {
      props += ' expanded'
    }

    const html = `<sl-tree-item id='${newid}' data-id='${item.id}' ${props} data-description='${JH.sanitize(item.description)}'>${JH.sanitize(item.description)}</sl-tree-item>`
    const cont = new DOMParser().parseFromString(html, 'text/html')
    const newitem = cont.querySelector('body').firstChild

    parent.append(newitem)
    JH.event(`#${newid}`, 'sl-collapse', (ev) => {
      const lskey = `${user}_${root}_expanded_${ev.target.id}`
      localStorage.removeItem(lskey)
    })
    JH.event(`#${newid}`, 'sl-expand', (ev) => {
      const lskey = `${user}_${root}_expanded_${ev.target.id}`
      localStorage.setItem(lskey, '1')
    })

    // Recurse with children
    if (item?.children.length) {
      treeFillItems(newid, item.children, root)
    }
  }
}

export function treeItemSelect (elemid) {
  const treeitem = JH.query(`#${elemid}`)

  // Expand parents
  const parents = JH.parents(treeitem, 'sl-tree-item')
  for (const parent of parents) {
    parent.setAttribute('expanded', 'expanded')
  }

  const selected = JH.queryAll('sl-tree-item[selected]')
  for (const s of selected) {
    s.removeAttribute('selected')
  }
  treeitem.setAttribute('selected', 'selected')
  setTimeout(() => {
    treeitem.scrollIntoView()
  }, 200)
}

let searchTreeIndex = 0
export function treeSearch (elemid, searchstring, start) {
  if (start === undefined) {
    searchTreeIndex = 0
  }

  const treeitems = JH.queryAll(`#${elemid} sl-tree-item`)
  const searchtoken = searchstring.toLowerCase()

  let index = 0
  for (const treeitem of treeitems) {
    if (treeitem.getAttribute('data-description').toLowerCase().includes(searchtoken)) {
      if (index === searchTreeIndex) {
        // Select item and show it
        treeItemSelect(treeitem.id)
        dispatchEvent(itemFound)

        // Store last viewed item
        const user = getUser()
        const lskey = `${user}_${elemid}_selected`
        localStorage.setItem(lskey, treeitem.id)

        return true
      }
      index++
    }
  }
  return false
}

export function treeSearchNext (elemid, searchstring) {
  searchTreeIndex++
  const ret = treeSearch(elemid, searchstring, searchTreeIndex)
  if (!ret) {
    searchTreeIndex--
  }
  return ret
}

export function treeSearchPrevious (elemid, searchstring) {
  searchTreeIndex--
  const ret = treeSearch(elemid, searchstring, searchTreeIndex)
  if (!ret) {
    searchTreeIndex++
  }
  return ret
}

export function showToast (variant, text) {
  const icon = {
    success: 'check2-circle',
    primary: 'info-circle',
    danger: 'exclamation-octagon',
    warning: 'exclamation-triangle'
  }

  const alert = Object.assign(document.createElement('sl-alert'), {
    variant,
    closable: true,
    duration: 3000,
    innerHTML: `<sl-icon name="${icon[variant]}" slot="icon"></sl-icon>${text}`
  })

  document.body.append(alert)
  alert.toast()
}

export function getUser () {
  return JH.value('#v-user')
}

export function getCSRFToken () {
  return JH.value('#_csrf')
}

if (JH.query('#pageid')) {
  const pageid = JH.value('#pageid')
  const elem = JH.query(`.page-sidebar .link[pageid=${pageid}]`)
  if (elem) {
    elem.classList.add('current')
  }
}

export function simpleTreeFill (id, data) {
  simpleTreeFillItems(id, data)
  if (data.length === 0) {
    JH.query(`#${id}`).innerHTML = '<sl-tree-item>No data found</sl-tree-item>'
  }
}

export function simpleTreeFillItems (id, data) {
  const parent = JH.query(`#${id}`)

  for (const item of data) {
    const newid = `item-${id}-${item.id}`

    let badge = '<sl-badge style="margin-left:0.5em;" pill variant="danger">No access</sl-badge>'
    if (item?.permissions?.read) {
      badge = '<sl-badge style="margin-left:0.5em;" pill variant="warning">R</sl-badge>'
    }
    if (item?.permissions?.write) {
      badge = '<sl-badge style="margin-left:0.5em;" pill variant="success">RW</sl-badge>'
    }

    const html = `<sl-tree-item id='${newid}' data-id='${item.id}' expanded data-description='${JH.sanitize(item.description)}'>${JH.sanitize(item.description)}${badge}</sl-tree-item>`
    const cont = new DOMParser().parseFromString(html, 'text/html')
    const newitem = cont.querySelector('body').firstChild

    parent.append(newitem)

    // Recurse with children
    if (item?.children.length) {
      simpleTreeFillItems(newid, item.children)
    }
  }
}

// Init search box
SB.init()
