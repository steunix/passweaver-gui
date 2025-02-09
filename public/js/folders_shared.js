/* global location, dispatchEvent */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let folderSearchTimeout

const refresh = new Event('folders-refresh')

export const currentPermissions = {
  read: false,
  write: false
}

const domCache = {
  sectionTitle: JH.query('#sectiontitle'),
  folderCreateButton: JH.query('#foldercreate'),
  folderCreateDialog: JH.query('#foldercreatedialog'),
  folderCreateSaveButton: JH.query('#foldercreatesave'),
  folderCreateDescription: JH.query('#foldercreatedescription'),
  folderCreateCancelButton: JH.query('#foldercreatecancel'),
  folderEditButton: JH.query('#folderedit'),
  folderEditDialog: JH.query('#foldereditdialog'),
  folderEditSaveButton: JH.query('#foldereditsave'),
  folderEditDescription: JH.query('#foldereditdescription'),
  folderEditCancelButton: JH.query('#foldereditcancel'),
  folderRemoveButton: JH.query('#folderremove'),
  folderSearch: JH.query('#foldersearch'),
  folderSearchNext: JH.query('#foldersearchnext'),
  folderSearchPrevious: JH.query('#foldersearchprevious')
}

export function currentFolder () {
  try {
    return JH.query('sl-tree-item[selected]').getAttribute('data-id')
  } catch (err) {
    return ''
  }
}

function folderCreateDialog () {
  JH.value('#foldercreatedialog sl-input,sl-textarea', '')
  folderCreateEnable()
  domCache.folderCreateDialog.show()
}

function folderCreateEnable () {
  const descr = JH.value(domCache.folderCreateDescription)
  if (descr === '') {
    domCache.folderCreateSaveButton.setAttribute('disabled', 'disabled')
  } else {
    domCache.folderCreateSaveButton.removeAttribute('disabled')
  }
}

async function folderCreate () {
  const itemdata = {
    _csrf: PW.getCSRFToken(),
    description: JH.value('#foldercreatedescription')
  }

  domCache.folderCreateDialog.hide()
  const resp = await JH.http(`/api/foldernew/${currentFolder()}`, itemdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Folder created')
  dispatchEvent(refresh)
}

async function folderRemove () {
  PW.confirmDialog('Delete folder', 'Are you sure you want to delete this folder?', async () => {
    const resp = await JH.http(`/api/folderremove/${currentFolder()}`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    PW.showToast('success', 'Folder deleted')
    dispatchEvent(refresh)
  }, 'Delete', 'danger')
}

function folderEditDialog () {
  domCache.folderEditDialog.show()
  folderEditFill()
}

function folderEditEnable () {
  const descr = JH.value(domCache.folderEditDescription)
  if (descr === '') {
    domCache.folderEditSaveButton.setAttribute('disabled', 'disabled')
  } else {
    domCache.folderEditSaveButton.removeAttribute('disabled')
  }
}

async function folderEditFill () {
  const resp = await JH.http(`/api/folders/${currentFolder()}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  JH.value(domCache.folderEditDescription, body.data.description)
  folderEditEnable()
}

async function folderEdit () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: JH.value('#foldereditdescription')
  }

  domCache.folderEditDialog.hide()
  const resp = await JH.http(`/api/folderupdate/${currentFolder()}`, data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Folder updated')
  dispatchEvent(refresh)
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
    const items = JH.queryAll('sl-tree-item')
    for (const item of items) {
      item.classList.remove('dragover')
    }
    return
  }

  location.reload()
}

// Event handlers
JH.event(domCache.folderCreateDescription, 'keyup', folderCreateEnable)
JH.event(domCache.folderRemoveButton, 'click', folderRemove)

JH.event(domCache.folderEditButton, 'click', folderEditDialog)

JH.event(domCache.folderCreateButton, 'click', (ev) => {
  if (currentFolder() === '') {
    PW.errorDialog('Select a parent folder in the tree')
    return
  }
  folderCreateDialog()
})

JH.event(domCache.folderCreateSaveButton, 'click', folderCreate)
JH.event(domCache.folderCreateCancelButton, 'click', (ev) => {
  domCache.folderCreateDialog.hide()
})

JH.event(domCache.folderEditDescription, 'keyup', folderEditEnable)
JH.event(domCache.folderEditCancelButton, 'click', (ev) => {
  domCache.folderEditDialog.hide()
})
JH.event(domCache.folderEditSaveButton, 'click', folderEdit)

JH.event('#foldersearch', 'sl-input', (ev) => {
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
