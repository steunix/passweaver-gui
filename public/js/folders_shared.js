/* global location, dispatchEvent */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let folderSearchTimeout

const refresh = new Event('folders-refresh')

export const currentPermissions = {
  read: false,
  write: false
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
  JH.query('#foldercreatedialog').show()
}

function folderCreateEnable () {
  const descr = JH.value('#foldercreatedescription')
  if (descr === '') {
    JH.query('#foldercreatesave').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#foldercreatesave').removeAttribute('disabled')
  }
}

async function folderCreate () {
  const itemdata = {
    _csrf: PW.getCSRFToken(),
    description: JH.value('#foldercreatedescription')
  }

  JH.query('#foldercreatedialog').hide()
  const resp = await JH.http(`/api/foldernew/${currentFolder()}`, itemdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Folder created')
  dispatchEvent(refresh)
}

async function folderRemove () {
  PW.confirmDialog('Delete folder', 'Are you sure you want to delete this folder?', async () => {
    JH.query('#foldercreatedialog').hide()
    const resp = await JH.http(`/api/folderremove/${currentFolder()}`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    PW.showToast('success', 'Folder deleted')
    dispatchEvent(refresh)
  }, 'Delete', 'danger')
}

function folderEditDialog () {
  JH.query('#foldereditdialog').show()
  folderEditFill()
}

function folderEditEnable () {
  const descr = JH.value('#foldereditdescription')
  if (descr === '') {
    JH.query('#foldereditsave').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#foldereditsave').removeAttribute('disabled')
  }
}

async function folderEditFill () {
  const resp = await JH.http(`/api/folders/${currentFolder()}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  JH.value('#foldereditdescription', body.data.description)
  folderEditEnable()
}

async function folderEdit () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: JH.value('#foldereditdescription')
  }

  JH.query('#foldereditdialog').hide()
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
JH.event('#foldercreatedescription', 'keyup', (ev) => {
  folderCreateEnable()
})

JH.event('#folderremove', 'click', (ev) => {
  folderRemove()
})

JH.event('#folderedit', 'click', (ev) => {
  folderEditDialog()
})
JH.event('#foldercreate', 'click', (ev) => {
  if (currentFolder() === '') {
    PW.errorDialog('Select a parent folder in the tree')
    return
  }
  folderCreateDialog()
})

JH.event('#foldercreatesave', 'click', (ev) => {
  folderCreate()
})
JH.event('#foldercreatecancel', 'click', (ev) => {
  JH.query('#foldercreatedialog').hide()
})

JH.event('#foldereditdescription', 'keyup', (ev) => {
  folderEditEnable()
})
JH.event('#foldereditcancel', 'click', (ev) => {
  JH.query('#foldereditdialog').hide()
})
JH.event('#foldereditsave', 'click', (ev) => {
  folderEdit()
})

JH.event('#foldersearch', 'sl-input', (ev) => {
  if (folderSearchTimeout) {
    clearTimeout(folderSearchTimeout)
  }
  folderSearchTimeout = setTimeout(() => {
    const search = JH.value('#foldersearch')
    if (!PW.treeSearch('folderstree', search)) {
      PW.showToast('danger', 'Not found')
    }
  }, 250)
})

JH.event('#foldersearchnext', 'click', (ev) => {
  const search = JH.value('#foldersearch')
  PW.treeSearchNext('folderstree', search)
})
JH.event('#foldersearchprevious', 'click', (ev) => {
  const search = JH.value('#foldersearch')
  PW.treeSearchPrevious('folderstree', search)
})
