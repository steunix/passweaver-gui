/* global dispatchEvent, DOMParser, localStorage */

import * as JH from './jh.js'
import * as SB from './searchbox.js'

const itemFound = new Event('pw-item-found')

const domCache = {
  errorDialog: JH.query('#errordialog'),
  errorDialogText: JH.query('#errordialogtext'),
  errorDialogClose: JH.query('#errordialogclose'),
  confirmDialog: JH.query('#confirmdialog'),
  confirmOkButton: JH.query('#confirmok'),
  confirmCancelButton: JH.query('#confirmcancel'),
  confirmDialogText: JH.query('#confirmdialogtext'),
  user: JH.query('#v-user'),
  csrf: JH.query('#_csrf'),
  pageid: JH.query('#pageid')
}

export function setTableLoading (selector) {
  JH.query(selector).querySelector('tbody').innerHTML =
    "<tr><td colspan='99'><wa-skeleton effect='pulse'></wa-skeleton></td></tr>"
}

export function setTreeviewLoading (selector) {
  JH.query(selector).innerHTML =
    '<wa-tree-item>Loading...</wa-tree-item>'
}

export function confirmDialog (title, text, callback, savetext, savevariant) {
  const dialog = domCache.confirmDialog
  dialog.setAttribute('label', title)

  // Remove existing event listeners
  domCache.confirmOkButton.replaceWith(domCache.confirmOkButton.cloneNode(true))

  // Refresh dom cache
  domCache.confirmOkButton = JH.query('#confirmok')

  domCache.confirmOkButton.innerHTML = 'Confirm'
  domCache.confirmOkButton.setAttribute('variant', 'primary')

  domCache.confirmDialogText.innerHTML = text

  if (savetext !== undefined) {
    domCache.confirmOkButton.innerHTML = savetext
  }
  if (savevariant !== undefined) {
    domCache.confirmOkButton.setAttribute('variant', savevariant)
  }
  JH.event(domCache.confirmOkButton, 'click', (ev) => {
    dialog.hide()
    callback()
  })

  // Remove existing event listeners
  domCache.confirmCancelButton.replaceWith(domCache.confirmCancelButton.cloneNode(true))

  // Refresh dom cache
  domCache.confirmCancelButton = JH.query('#confirmcancel')

  dialog.addEventListener('wa-request-close', event => {
    if (event.detail.source === 'overlay') {
      event.preventDefault()
    }
  })
  dialog.show()
}

export function errorDialog (text, subject) {
  const dialog = domCache.errorDialog
  domCache.errorDialogText.innerHTML = text

  // Remove existing event listeners
  domCache.errorDialogClose.replaceWith(domCache.errorDialogClose.cloneNode(true))

  // Refresh dom cache
  domCache.errorDialogClose = JH.query('#errordialogclose')

  domCache.errorDialog.setAttribute('label', subject || 'PassWeaver')
  JH.event(domCache.errorDialogClose, 'click', event => {
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

  if (!JH.attribute(`#${id}`, 'evt-wa-selection-change')) {
    JH.event(`#${id}`, 'wa-selection-change', (ev) => {
      const sel = JH.query('wa-tree-item[selected]')
      const id = sel.getAttribute('data-id')
      callback(id)

      // Save last item
      const user = getUser()
      const lskey = `${user}_${ev.target.id}_selected`
      localStorage.setItem(lskey, sel.id)
    })
    JH.attribute(`#${id}`, 'evt-wa-selection-change', '1')
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

    const html = `<wa-tree-item id='${newid}' data-id='${item.id}' ${props} data-description='${JH.sanitize(item.description)}'>${JH.sanitize(item.description)}</wa-tree-item>`
    const cont = new DOMParser().parseFromString(html, 'text/html')
    const newitem = cont.querySelector('body').firstChild

    parent.append(newitem)
    JH.event(`#${newid}`, 'wa-collapse', (ev) => {
      const lskey = `${user}_${root}_expanded_${ev.target.id}`
      localStorage.removeItem(lskey)
    })
    JH.event(`#${newid}`, 'wa-expand', (ev) => {
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
  const parents = JH.parents(treeitem, 'wa-tree-item')
  for (const parent of parents) {
    parent.setAttribute('expanded', 'expanded')
  }

  const selected = JH.queryAll('wa-tree-item[selected]')
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

  const treeitems = JH.queryAll(`#${elemid} wa-tree-item`)
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

  const alert = Object.assign(document.createElement('wa-alert'), {
    variant,
    closable: true,
    duration: 3000,
    innerHTML: `<wa-icon name="${icon[variant]}" slot="icon"></wa-icon>${text}`
  })

  document.body.append(alert)
  alert.toast()
}

export function getUser () {
  return JH.value(domCache.user)
}

export function getCSRFToken () {
  return JH.value(domCache.csrf)
}

if (domCache.pageid) {
  const pageid = JH.value(domCache.pageid)
  const elem = JH.query(`.page-sidebar .link[pageid=${pageid}]`)
  if (elem) {
    elem.classList.add('current')
  }
}

export function simpleTreeFill (id, data) {
  JH.query(`#${id}`).innerHTML = ''
  simpleTreeFillItems(id, data)
  if (data.length === 0) {
    JH.query(`#${id}`).innerHTML = '<wa-tree-item>No data found</wa-tree-item>'
  }
}

export function simpleTreeFillItems (id, data) {
  const parent = JH.query(`#${id}`)

  for (const item of data) {
    const newid = `item-${id}-${item.id}`

    let badge = '<wa-badge style="margin-left:0.5em;" pill variant="danger">No access</wa-badge>'
    if (item?.permissions?.read) {
      badge = '<wa-badge style="margin-left:0.5em;" pill variant="warning">R</wa-badge>'
    }
    if (item?.permissions?.write) {
      badge = '<wa-badge style="margin-left:0.5em;" pill variant="success">RW</wa-badge>'
    }

    const html = `<wa-tree-item id='${newid}' data-id='${item.id}' expanded data-description='${JH.sanitize(item.description)}'>${JH.sanitize(item.description)}${badge}</wa-tree-item>`
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
