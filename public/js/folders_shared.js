/* global jhEvent, jhValue, jhFetch, jhQuery, jhQueryAll, location, dispatchEvent */

import * as PW from './passweaver-gui.js'

let folderSearchTimeout

const refresh = new Event('folders-refresh')

export const currentPermissions = {
  read: false,
  write: false
}

export function currentFolder () {
  try {
    return jhQuery('sl-tree-item[selected]').getAttribute('data-id')
  } catch (err) {
    return ''
  }
}

function folderCreateDialog () {
  jhValue('#foldercreatedialog sl-input,sl-textarea', '')
  folderCreateEnable()
  jhQuery('#foldercreatedialog').show()
}

function folderCreateEnable () {
  const descr = jhValue('#foldercreatedescription')
  if (descr === '') {
    jhQuery('#foldercreatesave').setAttribute('disabled', 'disabled')
  } else {
    jhQuery('#foldercreatesave').removeAttribute('disabled')
  }
}

async function folderCreate () {
  const itemdata = {
    _csrf: PW.getCSRFToken(),
    description: jhValue('#foldercreatedescription')
  }

  jhQuery('#foldercreatedialog').hide()
  const resp = await jhFetch(`/api/foldernew/${currentFolder()}`, itemdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Folder created')
  dispatchEvent(refresh)
}

async function folderRemove () {
  PW.confirmDialog('Delete folder', 'Are you sure you want to delete this folder?', async () => {
    jhQuery('#foldercreatedialog').hide()
    const resp = await jhFetch(`/api/folderremove/${currentFolder()}`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    PW.showToast('success', 'Folder deleted')
    dispatchEvent(refresh)
  }, 'Delete', 'danger')
}

function folderEditDialog () {
  jhQuery('#foldereditdialog').show()
  folderEditFill()
}

function folderEditEnable () {
  const descr = jhValue('#foldereditdescription')
  if (descr === '') {
    jhQuery('#foldereditsave').setAttribute('disabled', 'disabled')
  } else {
    jhQuery('#foldereditsave').removeAttribute('disabled')
  }
}

async function folderEditFill () {
  const resp = await jhFetch(`/api/folders/${currentFolder()}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  jhValue('#foldereditdescription', body.data.description)
  folderEditEnable()
}

async function folderEdit () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: jhValue('#foldereditdescription')
  }

  jhQuery('#foldereditdialog').hide()
  const resp = await jhFetch(`/api/folderupdate/${currentFolder()}`, data)
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

  const resp = await jhFetch(`/api/folderupdate/${id}`, data)
  if (!await PW.checkResponse(resp)) {
    const items = jhQueryAll('sl-tree-item')
    for (const item of items) {
      item.classList.remove('dragover')
    }
    return
  }

  location.reload()
}

// Event handlers
jhEvent('#foldercreatedescription', 'keyup', (ev) => {
  folderCreateEnable()
})

jhEvent('#folderremove', 'click', (ev) => {
  folderRemove()
})

jhEvent('#folderedit', 'click', (ev) => {
  folderEditDialog()
})
jhEvent('#foldercreate', 'click', (ev) => {
  if (currentFolder() === '') {
    PW.errorDialog('Select a parent folder in the tree')
    return
  }
  folderCreateDialog()
})

jhEvent('#foldercreatesave', 'click', (ev) => {
  folderCreate()
})
jhEvent('#foldercreatecancel', 'click', (ev) => {
  jhQuery('#foldercreatedialog').hide()
})

jhEvent('#foldereditdescription', 'keyup', (ev) => {
  folderEditEnable()
})
jhEvent('#foldereditcancel', 'click', (ev) => {
  jhQuery('#foldereditdialog').hide()
})
jhEvent('#foldereditsave', 'click', (ev) => {
  folderEdit()
})

jhEvent('#foldersearch', 'sl-input', (ev) => {
  if (folderSearchTimeout) {
    clearTimeout(folderSearchTimeout)
  }
  folderSearchTimeout = setTimeout(() => {
    const search = jhValue('#foldersearch')
    if (!PW.treeSearch('folderstree', search)) {
      PW.showToast('danger', 'Not found')
    }
  }, 250)
})

jhEvent('#foldersearchnext', 'click', (ev) => {
  const search = jhValue('#foldersearch')
  PW.treeSearchNext('folderstree', search)
})
jhEvent('#foldersearchprevious', 'click', (ev) => {
  const search = jhValue('#foldersearch')
  PW.treeSearchPrevious('folderstree', search)
})
