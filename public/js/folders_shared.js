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
  folderDialog: JH.query('#folderdialog'),
  folderDialogId: JH.query('#folderdialogid'),
  folderDialogDescription: JH.query('#folderdescription'),
  folderDialogSave: JH.query('#foldersave'),
  folderRemoveButton: JH.query('#folderremove'),
  folderCreateButton: JH.query('#foldercreate'),
  folderEditButton: JH.query('#folderedit'),
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

function folderDialogShow (id) {
  JH.value(JH.query(domCache.folderDialog).querySelectorAll('wa-input'), '')

  if (id?.length) {
    folderEditFill(id)
    JH.value(domCache.folderDialogId, id)
  }

  domCache.folderDialog.show()
  folderSaveEnable()
}

function folderDialogHide () {
  domCache.folderDialog.hide()
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

JH.event(domCache.folderSearch, 'wa-input', (ev) => {
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
