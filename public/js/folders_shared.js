/* global location, dispatchEvent */

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
    const ret = JH.query('wa-tree-item[selected]').getAttribute('data-id')
    if (ret === 'undefined') {
      console.warn('currentFolder: got "undefined" as folder id, returning empty string instead')
      return ''
    }
    if (ret === undefined || ret === null) {
      return ''
    }
    return ret
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
  let bc = `<wa-breadcrumb style="display:block"><span slot="separator">/</span><span style='margin-right: 0.5em;'>${JH.sanitize(prefix)}</span>`
  let pid = id
  let parents = []

  let level = 0
  let current = JH.query(`wa-tree-item[data-id="${id}"]`)
  let pdesc = current.getAttribute('data-description')
  if (!current) {
    return bc
  }
  parents.push(`<wa-breadcrumb-item href="/pages/${page}?viewfolder=${current.getAttribute('data-id')}">${JH.sanitize(pdesc)}</wa-breadcrumb-item>`)

  while (current && level < 10) {
    let parent = current.parentElement.closest('wa-tree-item')
    if (!parent) {
      break
    }
    if (parent.getAttribute('data-id') === '0') {
      break
    }

    let pdesc = parent.getAttribute('data-description')
    parents.push(`<wa-breadcrumb-item style="font-size:75%;" href="/pages/${page}?viewfolder=${parent.getAttribute('data-id')}">${JH.sanitize(pdesc)}</wa-breadcrumb-item>`)
    current = parent
    level++
  }

  bc += parents.reverse().join('')
  bc += `<wa-button id="folder-copy-link" data-id="${id}" size="small" appearance="plain" value="" label="Copy folder link"><wa-icon name="copy" variant="regular"></wa-icon></wa-button>`
  bc += `</wa-breadcrumb>`
  return bc
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
