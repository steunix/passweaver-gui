/* global addEventListener */

import * as JH from './jh.js'
import * as Folders from './folders_shared.js'
import * as CPicker from './picker.js'
import * as PW from './passweaver-gui.js'

const domCache = {
  sectionTitle: JH.query('#sectiontitle'),
  folderCreateButton: JH.query('#foldercreate'),
  folderRemoveButton: JH.query('#folderremove'),
  folderEditButton: JH.query('#folderedit'),
  groupsTable: JH.query('#groupstable'),
  groupsTableBody: JH.query('#groupstable tbody'),
  groupsAddButton: JH.query('#addgroup'),
  foldersTree: JH.query('#folderstree')
}

async function fillGroups () {
  domCache.groupsTableBody.innerHTML = ''
  if (!Folders.currentFolder()) {
    return
  }

  PW.setTableLoading(domCache.groupsTable)

  const resp = await JH.http(`/api/foldergroups/${Folders.currentFolder()}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.data.length) {
    let row = '<tr>'
    for (const itm of body.data) {
      if (itm.inherited) {
        row += '<td colspan="2">Inherited</td>'
      } else {
        if (itm.canmodify) {
          row += `<td><sl-icon-button id='removegroup-${itm.id}' data-id='${itm.id}' name='trash3' title='Remove' style='color:red;'></sl-icon-button></td>`
          row += `<td><sl-icon-button id='togglegroup-${itm.id}' data-id='${itm.id}' name='shield-lock' title='Toggle permissions'></sl-icon-button></td>`
        } else {
          row += '<td></td><td></td>'
        }
      }
      row += '<td class="border-start border-end">' + (itm.write ? 'Read + write' : 'Read only') + '</td>'
      row += `<td>${itm.description}</td></tr>`

      // Check if groups can be added
      if (!itm.canmodify) {
        domCache.groupsAddButton.setAttribute('disabled', 'disabled')
      } else {
        domCache.groupsAddButton.removeAttribute('disabled')
      }
    }
    domCache.groupsTableBody.innerHTML = row

    // Event handlers
    JH.event('[id^=removegroup]', 'click', groupRemove)
    JH.event('[id^=togglegroup]', 'click', groupToggle)
  }
}

async function folderClicked () {
  PW.setTableLoading(domCache.groupsTable)

  const resp = await JH.http(`/api/folders/${Folders.currentFolder()}`)

  // Folder may not be accessible
  if (!await PW.checkResponse(resp, 403)) {
    return
  }

  const body = await resp.json()
  if (body.data && body.data.permissions) {
    Folders.currentPermissions.write = body.data.permissions.write
    Folders.currentPermissions.read = body.data.permissions.read
  } else {
    Folders.currentPermissions.write = true
    Folders.currentPermissions.read = true
  }

  if (Folders.currentPermissions.write) {
    domCache.folderCreateButton.removeAttribute('disabled')
    domCache.folderRemoveButton.removeAttribute('disabled')
    domCache.folderEditButton.removeAttribute('disabled')
  } else {
    domCache.folderCreateButton.setAttribute('disabled', 'disabled')
    domCache.folderRemoveButton.setAttribute('disabled', 'disabled')
    domCache.folderEditButton.setAttribute('disabled', 'disabled')
  }

  domCache.sectionTitle.innerHTML = `${body.data.description} - Groups`

  // Load groups
  await fillGroups()
}

async function groupRemove (ev) {
  const group = ev.currentTarget.getAttribute('data-id')
  PW.confirmDialog('Remove group', 'Are you sure you want to remove the group?', async () => {
    const resp = await JH.http(`/api/folders/${Folders.currentFolder()}/groups/${group}`, { _csrf: PW.getCSRFToken() }, 'DELETE')
    if (!await PW.checkResponse(resp)) {
      return
    }

    await fillGroups()
    PW.showToast('success', 'Group removed')
  }, 'Remove', 'danger')
}

async function groupToggle (ev) {
  const group = ev.currentTarget.getAttribute('data-id')
  const resp = await JH.http(`/api/folders/${Folders.currentFolder()}/groups/${group}/toggle`, { _csrf: PW.getCSRFToken() })
  if (!await PW.checkResponse(resp)) {
    return
  }

  await fillGroups()
  PW.showToast('success', 'Group permissions changed')
}

async function groupPickerChoosen (group) {
  GPicker.hide()
  const resp = await JH.http(`/api/folders/${Folders.currentFolder()}/groups/${group}`, { _csrf: PW.getCSRFToken() })
  if (!await PW.checkResponse(resp)) {
    return
  }

  await fillGroups()
  PW.showToast('success', 'Group added')
}

async function fillFolders () {
  PW.setTreeviewLoading(domCache.foldersTree)

  const resp = await JH.http(`/api/users/${PW.getUser()}/folders`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  PW.treeFill('folderstree', body.data, folderClicked, true)
  await dndSetup()
}

await fillFolders()

// Drag'n'drop
async function dndSetup () {
  JH.draggable('sl-tree-item')
  JH.dropTarget('sl-tree-item', async (ev, data) => {
    const folder = data.data
    const newparent = ev.target.getAttribute('data-id')

    await Folders.folderMove(folder, newparent)
  })
}

JH.event(domCache.groupsAddButton, 'click', (ev) => {
  GPicker.show()
})
addEventListener('folders-refresh', async (ev) => {
  await fillFolders()
})
addEventListener('pw-item-found', async (ev) => {
  await folderClicked()
})

// Picker
const GPicker = new CPicker.Picker('groups', groupPickerChoosen)
