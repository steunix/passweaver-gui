/* global location, dispatchEvent, DOMParser */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let folderSearchTimeout

const refresh = new Event('folders-refresh')

export const currentPermissions = {
  read: false,
  write: false,
  personal: false
}

const domCache = {
  sectionTitle: JH.query('#sectiontitle'),
  folderDialog: JH.query('#folderdialog'),
  folderDialogLabel: JH.query('#folderdialoglabel'),
  folderDialogId: JH.query('#folderdialogid'),
  folderDialogDescription: JH.query('#folderdescription'),
  folderDialogSave: JH.query('#foldersave'),
  folderRemoveButton: JH.query('#folderremove'),
  folderCreateButton: JH.query('#foldercreate'),
  folderEditButton: JH.query('#folderedit'),
  folderCollapseButton: JH.query('#foldercollapse'),
  folderSearch: JH.query('#foldersearch'),
  folderSearchNext: JH.query('#foldersearchnext'),
  folderSearchPrevious: JH.query('#foldersearchprevious')
}

export function currentFolder () {
  try {
    return JH.query('wa-tree-item[selected]').getAttribute('data-id')
  } catch (err) {
    return ''
  }
}

export function currentFolderDescription () {
  try {
    return PW.escapeHTML(JH.query('wa-tree-item[selected]').getAttribute('data-description'))
  } catch (err) {
    return ''
  }
}

export async function folderCopyLink (folder) {
  const resp = await JH.http(`/api/folders/${folder}/link`)

  // Check response
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body?.data?.link) {
    navigator.clipboard.writeText(body.data.link)
    PW.showToast('success', 'Folder link copied to clipboard')
  }
}

export async function getBreadCrumb (id, page, prefix = '') {
  const doc = document.implementation.createHTMLDocument('')
  const breadcrumb = document.createElement('wa-breadcrumb')
  breadcrumb.setAttribute('style', 'display:block')

  const separator = document.createElement('span')
  separator.setAttribute('slot', 'separator')
  separator.textContent = '/'

  const prefixSpan = document.createElement('span')
  prefixSpan.setAttribute('style', 'margin-right: 0.5em;')
  prefixSpan.textContent = prefix

  breadcrumb.append(separator, prefixSpan)

  let level = 0
  let current = JH.query(`wa-tree-item[data-id="${id}"]`)

  if (!current) {
    doc.body.appendChild(breadcrumb)
    return doc
  }

  const parents = []
  const currentItem = document.createElement('wa-breadcrumb-item')
  currentItem.setAttribute('href', `/pages/${encodeURIComponent(page)}?viewfolder=${encodeURIComponent(current.getAttribute('data-id') || '')}`)
  currentItem.textContent = current.getAttribute('data-description') || ''
  parents.push(currentItem)

  while (current && level < 10) {
    const parent = current.parentElement.closest('wa-tree-item')
    if (!parent) {
      break
    }
    if (parent.getAttribute('data-id') === '0') {
      break
    }

    const parentItem = document.createElement('wa-breadcrumb-item')
    parentItem.setAttribute('style', 'font-size:75%;')
    parentItem.setAttribute('href', `/pages/${encodeURIComponent(page)}?viewfolder=${encodeURIComponent(parent.getAttribute('data-id') || '')}`)
    parentItem.textContent = parent.getAttribute('data-description') || ''
    parents.push(parentItem)

    current = parent
    level++
  }

  parents.reverse().forEach(item => breadcrumb.appendChild(item))

  const copyButton = document.createElement('wa-button')
  copyButton.setAttribute('id', 'folder-copy-link')
  copyButton.setAttribute('data-id', id || '')
  copyButton.setAttribute('size', 'small')
  copyButton.setAttribute('appearance', 'plain')
  copyButton.setAttribute('value', '')
  copyButton.setAttribute('label', 'Copy folder link')

  const copyIcon = document.createElement('wa-icon')
  copyIcon.setAttribute('name', 'copy')
  copyIcon.setAttribute('variant', 'regular')
  copyButton.appendChild(copyIcon)

  breadcrumb.appendChild(copyButton)
  doc.body.appendChild(breadcrumb)

  return doc
}

function folderDialogShow (id) {
  JH.value(JH.query(domCache.folderDialog).querySelectorAll('wa-input'), '')

  domCache.folderDialogLabel.innerHTML = (id?.length ? 'Edit folder ' : 'Create a new folder in ') + currentFolderDescription()

  if (id?.length) {
    folderEditFill(id)
    JH.value(domCache.folderDialogId, id)
  }

  domCache.folderDialog.show()
  folderSaveEnable()
}

function folderDialogHide () {
  domCache.folderDialog.open = false
}

function folderSaveEnable () {
  if (JH.value(domCache.folderDialogDescription) === '') {
    JH.disable(domCache.folderDialogSave)
  } else {
    JH.enable(domCache.folderDialogSave)
  }
}

async function folderSave () {
  const userdata = {
    _csrf: PW.getCSRFToken(),
    description: JH.value(domCache.folderDialogDescription)
  }

  folderDialogHide()

  const folderid = JH.value(domCache.folderDialogId)
  const api = folderid.length ? `folderupdate/${folderid}` : `foldernew/${currentFolder()}`
  const resp = await JH.http(`/api/${api}`, userdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', folderid ? 'Folder updated' : 'Folder created')
  dispatchEvent(refresh)
}

async function folderRemove () {
  const desc = currentFolderDescription() || 'this folder'
  PW.confirmDialog('Delete folder', `Are you sure you want to delete the folder <b>'${desc}'</b>?`, async () => {
    const resp = await JH.http(`/api/folderremove/${currentFolder()}`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    PW.showToast('success', 'Folder deleted')
    dispatchEvent(refresh)
  }, 'Delete', 'danger')
}

async function folderEditFill (id) {
  const resp = await JH.http(`/api/folders/${id}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  JH.value(domCache.folderDialogDescription, body.data.description)
  folderSaveEnable()
}

export async function folderMove (id, newparent) {
  if (id === newparent) {
    return
  }

  const data = {
    _csrf: PW.getCSRFToken(),
    parent: newparent
  }

  const resp = await JH.http(`/api/folderupdate/${id}`, data)
  if (!await PW.checkResponse(resp)) {
    const items = JH.queryAll('wa-tree-item')
    for (const item of items) {
      item.classList.remove('dragover')
    }
    return
  }

  location.reload()
}

// Event handlers
JH.event(domCache.folderRemoveButton, 'click', folderRemove)

JH.event(domCache.folderEditButton, 'click', ev => { folderDialogShow(currentFolder()) })

JH.event(domCache.folderCreateButton, 'click', (ev) => {
  if (currentFolder() === '') {
    PW.errorDialog('Select a parent folder in the tree')
    return
  }
  folderDialogShow()
})

JH.event(domCache.folderDialogDescription, 'keyup', folderSaveEnable)

JH.event(domCache.folderDialogSave, 'click', folderSave)

JH.event(domCache.folderSearch, 'input', (ev) => {
  if (folderSearchTimeout) {
    clearTimeout(folderSearchTimeout)
  }
  folderSearchTimeout = setTimeout(() => {
    const search = JH.value(domCache.folderSearch)
    if (!PW.treeSearch('folderstree', search)) {
      PW.showToast('danger', 'Not found')
    }
  }, 250)
})

JH.event(domCache.folderSearchNext, 'click', (ev) => {
  const search = JH.value(domCache.folderSearch)
  PW.treeSearchNext('folderstree', search)
})
JH.event(domCache.folderSearchPrevious, 'click', (ev) => {
  const search = JH.value(domCache.folderSearch)
  PW.treeSearchPrevious('folderstree', search)
})

JH.event(domCache.folderCollapseButton, 'click', (ev) => {
  PW.treeCollapseAll('folderstree')
})
