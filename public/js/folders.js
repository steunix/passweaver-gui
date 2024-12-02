/* global addEventListener */

import * as JH from './jh.js'
import * as Folders from './folders_shared.js'
import * as GPicker from './grouppicker.js'
import * as PW from './passweaver-gui.js'

async function fillGroups () {
  JH.query('#groupstable tbody').innerHTML = ''
  if (!Folders.currentFolder()) {
    return
  }

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
        JH.query('#addgroup').setAttribute('disabled', 'disabled')
      } else {
        JH.query('#addgroup').removeAttribute('disabled')
      }
    }
    JH.query('#groupstable tbody').innerHTML = row

    // Event handlers
    JH.event('[id^=removegroup]', 'click', groupRemove)
    JH.event('[id^=togglegroup]', 'click', groupToggle)
  }
}

async function folderClicked () {
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
    JH.query('#foldercreate').removeAttribute('disabled')
    JH.query('#folderremove').removeAttribute('disabled')
    JH.query('#folderedit').removeAttribute('disabled')
  } else {
    JH.query('#foldercreate').setAttribute('disabled', 'disabled')
    JH.query('#folderremove').setAttribute('disabled', 'disabled')
    JH.query('#folderedit').setAttribute('disabled', 'disabled')
  }

  JH.query('#sectiontitle').innerHTML = `${body.data.description} - Groups`

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
  const resp = await JH.http('/api/folderstree')
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  JH.query('sl-tree').innerHTML = ''
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

JH.event('#addgroup', 'click', (ev) => {
  GPicker.show(groupPickerChoosen)
})
addEventListener('folders-refresh', async (ev) => {
  await fillFolders()
})
addEventListener('pw-item-found', async (ev) => {
  folderClicked()
})
