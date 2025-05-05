/* global location, addEventListener */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'
import * as CPicker from './picker.js'

let groupSearchTimeout

const domCache = {
  sectionTitle: JH.query('#sectiontitle'),
  groupDialog: JH.query('#groupdialog'),
  groupDialogDescription: JH.query('#groupdescription'),
  groupDialogSave: JH.query('#groupsave'),
  groupDialogId: JH.query('#groupdialogid'),
  groupsTree: JH.query('#groupstree'),
  groupCreateButton: JH.query('#groupcreate'),
  groupRemoveButton: JH.query('#groupremove'),
  groupEditButton: JH.query('#groupedit'),
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
    return JH.query('wa-tree-item[selected]').getAttribute('data-id')
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
        row += `<td><wa-icon-button id='remove-${usr.id}' title='Remove from group' data-id='${usr.id}' name='trash3' style='color:red;'></wa-icon-button></td>`
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

function groupDialogShow (id) {
  JH.value(JH.query(domCache.groupDialog).querySelectorAll('wa-input'), '')

  if (id?.length) {
    groupEditFill(id)
    JH.value(domCache.groupDialogId, id)
  }

  domCache.groupDialog.show()
  groupSaveEnable()
}

function groupDialogHide () {
  domCache.groupDialog.open = false
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

async function groupSave () {
  const userdata = {
    _csrf: PW.getCSRFToken(),
    description: JH.value(domCache.groupDialogDescription)
  }

  groupDialogHide()

  const groupid = JH.value(domCache.groupDialogId)
  const api = groupid.length ? `groupupdate/${groupid}` : `groupnew/${currentGroup()}`
  const resp = await JH.http(`/api/${api}`, userdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  fillGroups()
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

async function groupEditFill (id) {
  const resp = await JH.http(`/api/groups/${id}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    JH.value(domCache.groupDialogDescription, body.data.description)
    groupSaveEnable()
  }
}

function groupSaveEnable () {
  if (JH.value(domCache.groupDialogDescription) === '') {
    JH.disable(domCache.groupDialogSave)
  } else {
    JH.enable(domCache.groupDialogSave)
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
    const items = JH.queryAll('wa-tree-item')
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
  JH.draggable('wa-tree-item')
  JH.dropTarget('wa-tree-item', async (ev, data) => {
    const group = data.data
    const newparent = ev.target.getAttribute('data-id')

    await groupMove(group, newparent)
  })
}

// Event handlers
JH.event(domCache.groupRemoveButton, 'click', groupRemove)
JH.event(domCache.groupEditButton, 'click', ev => { groupDialogShow(currentGroup()) })
JH.event(domCache.groupCreateButton, 'click', ev => { groupDialogShow() })

JH.event(domCache.groupDialogDescription, 'keyup', groupSaveEnable)
JH.event(domCache.groupDialogSave, 'click', groupSave)

JH.event(domCache.newMemberButton, 'click', (ev) => {
  if (currentGroup() === '') {
    PW.errorDialog('Select a group in the tree')
    return
  }
  UPicker.show()
})

JH.event(domCache.removeAllMembersButton, 'click', groupRemoveAllMembers)

JH.event(domCache.groupSearch, 'input', (ev) => {
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
