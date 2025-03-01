/* global localStorage */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'
import * as CPicker from './picker.js'

let userSearchTimeout
let currentUser = ''

const domCache = {
  usersTable: JH.query('#userstable'),
  usersTableBody: JH.query('#userstable tbody'),
  usersSearch: JH.query('#usersearch'),
  groupsTable: JH.query('#groupstable'),
  groupsTableBody: JH.query('#groupstable tbody'),
  searchInput: JH.query('#usersearch'),
  userActivityTableBody: JH.query('#useractivitytable tbody'),
  userActivityLoadMore: JH.query('#useractivityload'),
  userActivityDialog: JH.query('#useractivitydialog'),
  newUserButton: JH.query('#newuser'),
  newUserDialog: JH.query('#newuserdialog'),
  newLogin: JH.query('#newlogin'),
  newEmail: JH.query('#newemail'),
  newLastName: JH.query('#newlastname'),
  newFirstName: JH.query('#newfirstname'),
  newLocale: JH.query('#newlocale'),
  newAuthMethod: JH.query('#newauthmethod'),
  newActive: JH.query('#newactive'),
  newPassword: JH.query('#newpassword'),
  newPasswordConfirm: JH.query('#newpasswordconfirm'),
  userCreateButton: JH.query('#usercreate'),
  newUserCancelButton: JH.query('#newuserdialog #cancel'),
  editLogin: JH.query('#editlogin'),
  editEmail: JH.query('#editemail'),
  editLastName: JH.query('#editlastname'),
  editFirstName: JH.query('#editfirstname'),
  editLocale: JH.query('#editlocale'),
  editAuthMethod: JH.query('#editauthmethod'),
  editActive: JH.query('#editactive'),
  userEditButton: JH.query('#useredit'),
  userEditDialog: JH.query('#edituserdialog'),
  genericTree: JH.query('#generictree'),
  foldersTreeDialog: JH.query('#folderstreedialog'),
  groupsAddButton: JH.query('#addgroup'),
  groupsCopyButton: JH.query('#copygroups'),
  groupsPasteButton: JH.query('#pastegroups'),
  groupsReplaceButton: JH.query('#replacegroups')
}

async function fillUsers () {
  PW.setTableLoading(domCache.usersTable)

  const search = JH.value(domCache.searchInput)
  const resp = await JH.http(`/api/userslist?search=${search}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()

  domCache.groupsTableBody.innerHTML = ''
  domCache.usersTableBody.innerHTML = ''

  if (body.data.length) {
    let row = ''
    for (const itm of body.data) {
      row +=
        `<tr data-id='${itm.id}' style='cursor:pointer'>` +
        '<td>' +
        `<sl-icon-button id='edituser-${itm.id}' title='Edit user' name='pencil' data-id='${itm.id}'></sl-icon-button>` +
        `<sl-icon-button id='removeuser-${itm.id}' title='Delete user' name='trash3' style='color:red;' data-id='${itm.id}'></sl-icon-button>` +
        `<sl-icon-button id='activity-${itm.id}' title='Activity' name='clock-history' data-id='${itm.id}'></sl-icon-button>` +
        `<sl-icon-button id='folders-${itm.id}' title='Visible folders' name='folder2-open' data-id='${itm.id}'></sl-icon-button>` +
        '</td>' +
        `<td class='border-start'>${JH.sanitize(itm.login)}</td>` +
        `<td>${JH.sanitize(itm.lastname)}</td>` +
        `<td>${JH.sanitize(itm.firstname)}</td>` +
        `<td>${JH.sanitize(itm.email)}</td>` +
        `<td>${JH.sanitize(itm.locale)}</td>` +
        `<td>${JH.sanitize(itm.authmethod)}</td>` +
        `<td class='text-center'><sl-icon name='${itm.active ? 'check-lg' : 'x-lg'}' style='color:${itm.active ? 'green' : 'red'}'/></td>` +
        '</tr>'
    }
    domCache.usersTableBody.innerHTML = row

    // Install event handlers
    JH.event('#userstable tbody tr', 'dblclick', (ev) => {
      userDoubleClicked(ev.currentTarget.getAttribute('data-id'))
    })
    JH.event('#userstable tbody tr [id^=edituser]', 'click', (ev) => {
      userEditDialog(ev.currentTarget.getAttribute('data-id'))
    })
    JH.event('#userstable tbody tr [id^=removeuser]', 'click', (ev) => {
      userRemove(ev.currentTarget.getAttribute('data-id'))
    })
    JH.event('#userstable tbody tr [id^=activity]', 'click', (ev) => {
      userActivity(ev.currentTarget.getAttribute('data-id'))
    })
    JH.event('#userstable tbody tr [id^=folders]', 'click', (ev) => {
      showUserFolders(ev.currentTarget.getAttribute('data-id'))
    })
    JH.event('#userstable tbody tr', 'click', (ev) => {
      currentUser = ev.currentTarget.getAttribute('data-id')

      const sel = JH.query('#userstable tbody tr.rowselected')
      if (sel) {
        sel.classList.remove('rowselected')
      }
      ev.currentTarget.classList.add('rowselected')
      fillGroups()
    })
  }
}

async function fillActivity (usr) {
  // If a table is already populated, get last id and get next page
  let lastid = ''
  const lastrow = JH.query('#useractivitytable tbody tr:last-child td[id^=event]')
  if (lastrow) {
    lastid = lastrow.getAttribute('data-id')
  }

  const resp = await JH.http(`/api/users/${usr}/activity?lastid=${lastid}`)

  // Check response
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()

  // Manual check response, because body has already been read
  if (body.data.length) {
    let row = ''
    for (const evt of body.data) {
      row += '<tr>'
      row += `<td id='event-${evt.id}' data-id='${evt.id}'>${evt.timestamp}</td>`
      row += `<td>${JH.sanitize(evt.action_description)}</td>`
      row += `<td>${JH.sanitize(evt.entity_description)}</td>`
      row += `<td>${JH.sanitize(evt.description || '')}</td>`
      row += `<td>${JH.sanitize(evt.note || '')}</td>`
    }
    domCache.userActivityTableBody.innerHTML += row
  } else {
    domCache.userActivityTableBody.innerHTML += '<tr><td colspan="99">No other activity found</td></tr>'
    JH.disable(domCache.userActivityLoadMore)
  }
}

async function fillGroups () {
  PW.setTableLoading(domCache.groupsTable)

  const resp = await JH.http(`/api/usergroups/${currentUser}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.data.length) {
    let row = ''
    for (const itm of body.data) {
      row += `<tr data-id='${itm.id}'>`
      if (itm.id !== 'E') {
        row += `<td><sl-icon-button id='removegroup-${itm.id}' data-id='${itm.id}' name='trash3' style='color:red;' title='Remove'></sl-icon-button></td>`
      } else {
        row += '<td></td>'
      }
      row += `<td>${JH.sanitize(itm.description)}</td></tr>`
    }
    domCache.groupsTableBody.innerHTML = row

    // Event handlers
    JH.event('[id^=removegroup]', 'click', groupRemove)
  } else {
    domCache.groupsTableBody.innerHTML = '<tr><td colspan="99">No group found</td></tr>'
  }
}

function userCreateDialog () {
  domCache.newUserDialog.show()
  JH.value('#newuserdialog sl-input,sl-textarea,sl-select', '')
  userCreateEnable()
}

async function userCreate () {
  const userdata = {
    _csrf: PW.getCSRFToken(),
    login: JH.value(domCache.newLogin),
    email: JH.value(domCache.newEmail),
    lastname: JH.value(domCache.newLastName),
    firstname: JH.value(domCache.newFirstName),
    locale: JH.value(domCache.newLocale),
    authmethod: JH.value(domCache.newAuthMethod),
    active: domCache.newActive.hasAttribute('checked'),
    secret: JH.value(domCache.newPassword)
  }

  domCache.newUserDialog.hide()
  const resp = await JH.http('/api/usernew/', userdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  fillUsers()
  PW.showToast('success', 'User created')
}

function userCreateEnable () {
  if (JH.value(domCache.newLogin) === '' ||
      JH.value(domCache.newEmail) === '' ||
      JH.value(domCache.newLastName) === '' ||
      JH.value(domCache.newPassword) !== JH.value(domCache.newPasswordConfirm) ||
      JH.value(domCache.newPassword) === '' ||
      JH.value(domCache.newLocale) === '' ||
      JH.value(domCache.newAuthMethod) === '') {
    JH.disable(domCache.userCreateButton)
  } else {
    JH.enable(domCache.userCreateButton)
  }
}

async function userRemove (usr) {
  PW.confirmDialog('Delete user', '<strong><span style="color:red;">Are you sure you want to delete this user? Also his personal folder and contained items will be deleted!</span></strong>', async () => {
    const resp = await JH.http(`/api/userremove/${usr}`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    fillUsers()
    PW.showToast('success', 'User removed')
  }, 'Delete', 'danger')
}

async function userEditFill (user) {
  const resp = await JH.http(`/api/users/${user}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()

  JH.value(domCache.editLogin, body.data.login)
  JH.value(domCache.editEmail, body.data.email)
  JH.value(domCache.editLastName, body.data.lastname)
  JH.value(domCache.editFirstName, body.data.firstname)
  JH.value(domCache.editLocale, body.data.locale)
  JH.value(domCache.editAuthMethod, body.data.authmethod)
  if (!body.data.active) {
    domCache.editActive.removeAttribute('checked')
  } else {
    domCache.editActive.setAttribute('checked', 'checked')
  }

  userEditEnable()
}

function userEditEnable () {
  if (JH.value(domCache.editLogin) === '' ||
      JH.value(domCache.editEmail) === '' ||
      JH.value(domCache.editLastName) === '' ||
      JH.value(domCache.editLocale) === '' ||
      JH.value(domCache.editAuthMethod) === '') {
    JH.disable(domCache.userEditButton)
  } else {
    JH.enable(domCache.userEditButton)
  }
}

function userEditDialog (userid) {
  userEditFill(userid)
  domCache.userEditDialog.show()
}

async function userEdit () {
  const userdata = {
    _csrf: PW.getCSRFToken(),
    login: JH.value(domCache.editLogin),
    email: JH.value(domCache.editEmail),
    lastname: JH.value(domCache.editLastName),
    firstname: JH.value(domCache.editFirstName),
    locale: JH.value(domCache.editLocale),
    authmethod: JH.value(domCache.editAuthMethod),
    active: domCache.editActive.hasAttribute('checked')
  }

  const resp = await JH.http(`/api/userupdate/${currentUser}`, userdata)
  domCache.userEditDialog.hide()
  if (!await PW.checkResponse(resp)) {
    return
  }

  fillUsers()
  PW.showToast('success', 'User saved')
}

function userDoubleClicked (user) {
  if (window.getSelection()) {
    window.getSelection().empty()
  }
  JH.query(`#edituser-${user}`).click()
}

async function groupRemove (ev) {
  const group = ev.currentTarget.getAttribute('data-id')
  PW.confirmDialog('Remove user from group', 'Are you sure you want to remove the user from the group?', async () => {
    const resp = await JH.http(`/api/groupremoveuser/${group}/${currentUser}`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    fillGroups()
    PW.showToast('success', 'Group removed')
  }, 'Remove', 'danger')
}

async function groupPickerChoosen (group) {
  GPicker.hide()
  const resp = await JH.http(`/api/groupadduser/${group}/${currentUser}`, { _csrf: PW.getCSRFToken() })
  if (!await PW.checkResponse(resp)) {
    return
  }

  fillGroups()
  PW.showToast('success', 'Group added')
}

async function userActivity (itm) {
  domCache.userActivityTableBody.innerHTML = ''
  domCache.userActivityDialog.show()
  JH.disable(domCache.userActivityLoadMore)
  fillActivity(itm)
}

function groupsCopy () {
  const groups = []
  const list = JH.queryAll('#groupstable tbody tr')

  if (!list.length) {
    localStorage.setItem(`${PW.getUser()}_copiedgroups`, '')
    domCache.groupsPasteButton.style.display = 'none'
    domCache.groupsReplaceButton.style.display = 'none'
    return
  }

  for (const el of list) {
    groups.push(el.getAttribute('data-id'))
  }

  if (groups.length) {
    localStorage.setItem(`${PW.getUser()}_copiedgroups`, groups)
    PW.showToast('success', 'Groups copied')
    domCache.groupsPasteButton.style.display = ''
    domCache.groupsReplaceButton.style.display = ''
  }
}

async function groupsReplace () {
  PW.confirmDialog('Replace groups', 'Are you sure you want to replace this user\'s groups with the copied ones?', async () => {
    const list = JH.queryAll('#groupstable tbody tr')

    if (!list.length) {
      domCache.groupsPasteButton.style.display = 'none'
      domCache.groupsReplaceButton.style.display = 'none'
      return
    }

    for (const el of list) {
      await JH.http(`/api/groupremoveuser/${el.getAttribute('data-id')}/${currentUser}`, { _csrf: PW.getCSRFToken() })
    }

    for (const el of localStorage.getItem(`${PW.getUser()}_copiedgroups`).split(',')) {
      await JH.http(`/api/groupadduser/${el}/${currentUser}`, { _csrf: PW.getCSRFToken() })
    }

    fillGroups()
    PW.showToast('success', 'Groups replaced')
  })
}

async function groupsPaste () {
  PW.confirmDialog('Paste groups', 'Are you sure you want to add the copied groups to this user?', async () => {
    for (const el of localStorage.getItem(`${PW.getUser()}_copiedgroups`).split(',')) {
      await JH.http(`/api/groupadduser/${el}/${currentUser}`, { _csrf: PW.getCSRFToken() })
    }

    fillGroups()
    PW.showToast('success', 'Groups pasted')
  })
}

async function showUserFolders (user) {
  PW.setTreeviewLoading(domCache.genericTree)
  domCache.foldersTreeDialog.show()

  const resp = await JH.http(`/api/users/${user}/folders?permissions=true`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  PW.simpleTreeFill('generictree', body.data)
}

await fillUsers()

// Event handlers
JH.event([domCache.newLogin, domCache.newEmail, domCache.newLastName, domCache.newPassword, domCache.newPasswordConfirm], 'keyup', userCreateEnable)
JH.event([domCache.newLocale, domCache.newAuthMethod], 'sl-change', userCreateEnable)
JH.event(domCache.userCreateButton, 'click', userCreate)
JH.event([domCache.editLogin, domCache.editEmail, domCache.editLastName], 'keyup', userEditEnable)
JH.event(domCache.userEditButton, 'click', userEdit)
JH.event(domCache.newUserButton, 'click', userCreateDialog)

JH.event(domCache.newUserCancelButton, 'click', (ev) => {
  domCache.newUserDialog.hide()
})
JH.event(domCache.usersSearch, 'sl-input', (ev) => {
  if (userSearchTimeout) {
    clearTimeout(userSearchTimeout)
  }
  userSearchTimeout = setTimeout(() => {
    domCache.groupsTableBody.innerHTML = ''
    fillUsers()
  }, 250)
})
JH.event(domCache.groupsAddButton, 'click', (ev) => {
  if (currentUser === '') {
    PW.errorDialog('Select a user from the list')
    return
  }
  GPicker.show()
})

JH.event(domCache.userActivityLoadMore, 'click', (ev) => {
  fillActivity(currentUser)
})

JH.event(domCache.groupsCopyButton, 'click', groupsCopy)
JH.event(domCache.groupsPasteButton, 'click', groupsPaste)
JH.event(domCache.groupsReplaceButton, 'click', groupsReplace)

// Picker
const GPicker = new CPicker.Picker('groups', groupPickerChoosen)
