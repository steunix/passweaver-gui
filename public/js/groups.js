/* global location, addEventListener */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'
import * as CPicker from './picker.js'

let groupSearchTimeout

const domCache = {
  sectionTitle: JH.query('#sectiontitle'),
  groupsTree: JH.query('#groupstree'),
  groupCreateButton: JH.query('#groupcreate'),
  groupCreateDialog: JH.query('#groupcreatedialog'),
  groupCreateSaveButton: JH.query('#groupcreatesave'),
  groupCreateDescription: JH.query('#groupcreatedescription'),
  groupCreateCancelButton: JH.query('#groupcreatecancel'),
  groupRemoveButton: JH.query('#groupremove'),
  groupEditButton: JH.query('#groupedit'),
  groupEditDialog: JH.query('#groupeditdialog'),
  groupEditDescription: JH.query('#groupeditdescription'),
  groupEditSaveButton: JH.query('#groupeditsave'),
  groupEditCancelButton: JH.query('#groupeditcancel'),
  newMemberButton: JH.query('#newmember'),
  removeAllMembersButton: JH.query('#removeallmembers'),
  groupSearch: JH.query('#groupsearch'),
  groupSearchNext: JH.query('#groupsearchnext'),
  groupSearchPrevious: JH.query('#groupsearchprevious'),
  groupFolders: JH.query('#groupfolders'),
  usersTable: JH.query('#userstable'),
  usersTableBody: JH.query('#userstable tbody'),
  genericTree: JH.query('#generictree'),
  foldersTreeDialog: JH.query('#folderstreedialog')
}

function currentGroup () {
  try {
    return JH.query('sl-tree-item[selected]').getAttribute('data-id')
  } catch (err) {
    return ''
  }
}

async function fillUsers () {
  PW.setTableLoading(domCache.usersTable)

  const resp = await fetch(`/api/userslist/${currentGroup()}`)

  if (!await PW.checkResponse(resp)) {
    return
  }
  const body = await resp.json()

  if (body.data.length) {
    let row = ''
    for (const usr of body.data) {
      row += `<tr data-id='${usr.id}'>`
      if (currentGroup() !== 'E') {
        row += `<td><sl-icon-button id='remove-${usr.id}' title='Remove from group' data-id='${usr.id}' name='trash3' style='color:red;'></sl-icon-button></td>`
      } else {
        row += '<td></td>'
      }
      row += `<td class='border-start border-end'>${usr.login}</td>` +
      `<td>${JH.sanitize(usr.lastname)}</td>` +
      `<td>${JH.sanitize(usr.firstname)}</td>`
    }
    domCache.usersTableBody.innerHTML = row

    // Install event handlers
    JH.event('#userstable tbody [id^=remove]', 'click', (ev) => {
      groupRemoveUser(ev.currentTarget.getAttribute('data-id'))
    })
  } else {
    domCache.usersTableBody.innerHTML = '<tr><td colspan="99">No user in this group</td></tr>'
  }

  // Group cannot be removed if not empty
  if (body.data.length) {
    JH.disable(domCache.groupRemoveButton)
  } else {
    JH.enable(domCache.groupRemoveButton)
  }
}

async function groupClicked (groupid) {
  fillUsers()
  if (groupid === '0' || groupid === 'E') {
    JH.disable(domCache.newMemberButton)
    JH.disable(domCache.removeAllMembersButton)
  } else {
    JH.enable(domCache.newMemberButton)
    JH.enable(domCache.removeAllMembersButton)
  }

  const resp = await JH.http(`/api/groups/${currentGroup()}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  domCache.sectionTitle.innerHTML = `${body.data.description} - Members`
}

function groupCreateEnable () {
  if (JH.value(domCache.groupCreateDescription) === '') {
    JH.disable(domCache.groupCreateSaveButton)
  } else {
    JH.enable(domCache.groupCreateSaveButton)
  }
}

function groupCreateDialog () {
  JH.value('#groupcreatedialog sl-input,sl-textarea', '')
  groupCreateEnable()
  domCache.groupCreateDialog.show()
}

async function groupCreate () {
  const userdata = {
    _csrf: PW.getCSRFToken(),
    description: JH.value(domCache.groupCreateDescription)
  }

  const resp = await JH.http(`/api/groupnew/${currentGroup()}`, userdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.data.id) {
    location.reload()
  } else {
    PW.errorDialog(body.message)
  }
}

async function groupRemove () {
  PW.confirmDialog('Remove group', 'Are you sure you want to remove this group?', async () => {
    const resp = await JH.http(`/api/groupremove/${currentGroup()}`, { _csrf: PW.getCSRFToken() })

    if (!await PW.checkResponse(resp)) {
      return
    }

    location.reload()
  })
}

function groupEditDialog () {
  groupEditFill()
  domCache.groupEditDialog.show()
}

async function groupEditFill () {
  const resp = await JH.http(`/api/groups/${currentGroup()}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    JH.value(domCache.groupEditDescription, body.data.description)
    groupEditEnable()
  }
}

async function groupEdit () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: JH.value(domCache.groupEditDescription)
  }

  const resp = await JH.http(`/api/groupupdate/${currentGroup()}`, data)
  if (!await PW.checkResponse(resp)) {
    domCache.groupEditDialog.hide()
    return
  }

  location.reload()
}

function groupEditEnable () {
  if (JH.value(domCache.groupEditDescription) === '') {
    JH.disable(domCache.groupEditSaveButton)
  } else {
    JH.enable(domCache.groupEditSaveButton)
  }
}

async function userPickerChoosen (id) {
  UPicker.hide()
  const resp = await JH.http(`/api/groupadduser/${currentGroup()}/${id}`, { _csrf: PW.getCSRFToken() })
  if (!await PW.checkResponse(resp)) {
    return
  }

  fillUsers()
  PW.showToast('success', 'User added to the group')
}

async function groupRemoveUser (id) {
  PW.confirmDialog('Remove user from group', 'Are you sure you want to remove the user from the group?', async () => {
    const resp = await JH.http(`/api/groupremoveuser/${currentGroup()}/${id}`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    fillUsers()
    PW.showToast('success', 'User removed from group')
  }, 'Remove', 'danger')
}

async function groupRemoveAllMembers (id) {
  PW.confirmDialog('Remove all members from group', 'Are you sure you want to remove all members the group?', async () => {
    const users = JH.queryAll('#userstable tr:has([data-id])')
    for (const user of users) {
      const userid = user.getAttribute('data-id')
      const resp = await JH.http(`/api/groupremoveuser/${currentGroup()}/${userid}`, { _csrf: PW.getCSRFToken() })
      if (!await PW.checkResponse(resp)) {
        return
      }
    }

    fillUsers()
    PW.showToast('success', 'Users removed from group')
  }, 'Remove', 'danger')
}

async function groupMove (id, newparent) {
  if (id === newparent) {
    return
  }

  const data = {
    _csrf: PW.getCSRFToken(),
    parent: newparent
  }

  const resp = await JH.http(`/api/groupupdate/${id}`, data)
  if (!await PW.checkResponse(resp)) {
    const items = JH.queryAll('sl-tree-item')
    for (const item of items) {
      item.classList.remove('dragover')
    }
    return
  }

  location.reload()
}

async function fillGroups () {
  PW.setTreeviewLoading(domCache.groupsTree)
  const resp = await fetch('/api/groupstree')
  if (await PW.checkResponse(resp)) {
    const body = await resp.json()
    PW.treeFill('groupstree', body.data, groupClicked, true)
    await dndSetup()
  }
}

async function showGroupFolders () {
  const grp = currentGroup()
  if (grp === '') {
    return
  }

  PW.setTreeviewLoading(domCache.genericTree)
  domCache.foldersTreeDialog.show()

  const resp = await JH.http(`/api/groups/${grp}/folders`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  PW.simpleTreeFill('generictree', body.data)
}

await fillGroups()

// Drag'n'drop
async function dndSetup () {
  JH.draggable('sl-tree-item')
  JH.dropTarget('sl-tree-item', async (ev, data) => {
    const group = data.data
    const newparent = ev.target.getAttribute('data-id')

    await groupMove(group, newparent)
  })
}

// Event handlers
JH.event(domCache.groupRemoveButton, 'click', groupRemove)
JH.event(domCache.groupEditButton, 'click', groupEditDialog)
JH.event(domCache.groupCreateButton, 'click', groupCreateDialog)

JH.event(domCache.groupCreateDescription, 'keyup', groupCreateEnable)
JH.event(domCache.groupCreateSaveButton, 'click', groupCreate)
JH.event(domCache.groupCreateCancelButton, 'click', (ev) => {
  domCache.groupCreateDialog.hide()
})

JH.event(domCache.groupEditDescription, 'keyup', groupEditEnable)
JH.event(domCache.groupEditSaveButton, 'click', groupEdit)
JH.event(domCache.groupEditCancelButton, 'click', (ev) => {
  domCache.groupEditDialog.hide()
})

JH.event(domCache.newMemberButton, 'click', (ev) => {
  if (currentGroup() === '') {
    PW.errorDialog('Select a group in the tree')
    return
  }
  UPicker.show()
})

JH.event(domCache.removeAllMembersButton, 'click', groupRemoveAllMembers)

JH.event(domCache.groupSearch, 'sl-input', (ev) => {
  if (groupSearchTimeout) {
    clearTimeout(groupSearchTimeout)
  }
  groupSearchTimeout = setTimeout(() => {
    const search = JH.value(domCache.groupSearch)
    if (!PW.treeSearch('groupstree', search)) {
      PW.showToast('danger', 'Not found')
    }
  }, 250)
})
JH.event(domCache.groupSearchNext, 'click', (ev) => {
  const search = JH.value(domCache.groupSearch)
  PW.treeSearchNext('groupstree', search)
})

JH.event(domCache.groupSearchPrevious, 'click', (ev) => {
  const search = JH.value(domCache.groupSearch)
  PW.treeSearchPrevious('groupstree', search)
})

JH.event(domCache.groupFolders, 'click', showGroupFolders)

addEventListener('pw-item-found', async (ev) => {
  await fillUsers()
})

// Picker
const UPicker = new CPicker.Picker('users', userPickerChoosen)
