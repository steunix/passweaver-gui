/* global localStorage */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'
import * as GPicker from './grouppicker.js'

let userSearchTimeout
let currentUser = ''

async function fillUsers () {
  const search = JH.value('#usersearch')
  const resp = await JH.http(`/api/userslist?search=${search}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()

  JH.query('#groupstable tbody').innerHTML = ''
  JH.query('#userstable tbody').innerHTML = ''

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
        `<td class='border-start'>${itm.login}</td>` +
        `<td>${itm.lastname}</td>` +
        `<td>${itm.firstname}</td>` +
        `<td>${itm.email}</td>` +
        `<td>${itm.locale}</td>` +
        `<td>${itm.authmethod}</td>` +
        `<td class='text-center'><sl-icon name='${itm.active ? 'check-lg' : 'x-lg'}' style='color:${itm.active ? 'green' : 'red'}'/></td>` +
        '</tr>'
    }
    JH.query('#userstable tbody').innerHTML = row

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
      row += `<td>${evt.action_description}</td>`
      row += `<td>${evt.entity_description}</td>`
      row += `<td>${evt.description || ''}</td>`
      row += `<td>${evt.note || ''}</td>`
    }
    JH.query('#useractivitytable tbody').innerHTML += row
  } else {
    JH.query('#useractivitytable tbody').innerHTML += '<tr><td colspan="99">No other activity found</td></tr>'
    JH.query('#useractivityload').setAttribute('disabled', 'disabled')
  }
}

async function fillGroups () {
  JH.query('#groupstable tbody').innerHTML = ''

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
      row += `<td>${itm.description}</td></tr>`
    }
    JH.query('#groupstable tbody').innerHTML = row

    // Event handlers
    JH.event('[id^=removegroup]', 'click', groupRemove)
  } else {
    JH.query('#groupstable tbody').innerHTML = '<tr><td colspan="99">No group found</td></tr>'
  }
}

function userCreateDialog () {
  JH.query('#newuserdialog').show()
  JH.value('#newuserdialog sl-input,sl-textarea,sl-select', '')
  userCreateEnable()
}

async function userCreate () {
  const userdata = {
    _csrf: PW.getCSRFToken(),
    login: JH.value('#newlogin'),
    email: JH.value('#newemail'),
    lastname: JH.value('#newlastname'),
    firstname: JH.value('#newfirstname'),
    locale: JH.value('#newlocale'),
    authmethod: JH.value('#newauthmethod'),
    active: JH.query('#newactive').hasAttribute('checked'),
    secret: JH.value('#newpassword')
  }

  JH.query('#newuserdialog').hide()
  const resp = await JH.http('/api/usernew/', userdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  fillUsers()
  PW.showToast('success', 'User created')
}

function userCreateEnable () {
  if (JH.value('#newlogin') === '' || JH.value('#newemail') === '' || JH.value('#newlastname') === '' ||
  JH.value('#newpassword') !== JH.value('#newpasswordconfirm') || JH.value('#newpassword') === '') {
    JH.query('#usercreate').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#usercreate').removeAttribute('disabled')
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

  JH.value('#editlogin', body.data.login)
  JH.value('#editemail', body.data.email)
  JH.value('#editlastname', body.data.lastname)
  JH.value('#editfirstname', body.data.firstname)
  JH.value('#editlocale', body.data.locale)
  JH.value('#editauthmethod', body.data.authmethod)
  if (!body.data.active) {
    JH.query('#editactive').removeAttribute('checked')
  } else {
    JH.query('#editactive').setAttribute('checked', 'checked')
  }

  userEditEnable()
}

function userEditEnable () {
  if (JH.value('#editlogin') === '' || JH.value('#editemail') === '' || JH.value('#editlastname') === '') {
    JH.query('#useredit').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#useredit').removeAttribute('disabled')
  }
}

function userEditDialog (userid) {
  userEditFill(userid)
  JH.query('#edituserdialog').show()
}

async function userEdit () {
  const userdata = {
    _csrf: PW.getCSRFToken(),
    login: JH.value('#editlogin'),
    email: JH.value('#editemail'),
    lastname: JH.value('#editlastname'),
    firstname: JH.value('#editfirstname'),
    locale: JH.value('#editlocale'),
    authmethod: JH.value('#editauthmethod'),
    active: JH.query('#editactive').hasAttribute('checked')
  }

  const resp = await JH.http(`/api/userupdate/${currentUser}`, userdata)
  JH.query('#edituserdialog').hide()
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
  JH.query('#useractivitytable tbody').innerHTML = ''
  JH.query('#useractivitydialog').show()
  fillActivity(itm)
}

function groupsCopy () {
  const groups = []
  const list = JH.queryAll('#groupstable tbody tr')

  if (!list.length) {
    localStorage.setItem(`${PW.getUser()}_copiedgroups`, '')
    JH.query('#pastegroups').style.display = 'none'
    JH.query('#replacegroups').style.display = 'none'
    return
  }

  for (const el of list) {
    groups.push(el.getAttribute('data-id'))
  }

  if (groups.length) {
    localStorage.setItem(`${PW.getUser()}_copiedgroups`, groups)
    PW.showToast('success', 'Groups copied')
    JH.query('#pastegroups').style.display = ''
    JH.query('#replacegroups').style.display = ''
  }
}

async function groupsReplace () {
  PW.confirmDialog('Replace groups', 'Are you sure you want to replace this user\'s groups with the copied ones?', async () => {
    const list = JH.queryAll('#groupstable tbody tr')

    if (!list.length) {
      JH.query('#pastegroups').style.display = 'none'
      JH.query('#replacegroups').style.display = 'none'
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
  JH.query('#generictree').innerHTML = 'Loading...'
  JH.query('#folderstreedialog').show()
  const resp = await JH.http(`/api/users/${user}/folders?permissions=true`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  PW.simpleTreeFill('generictree', body.data)
}

await fillUsers()

// Event handlers
JH.event('#newlogin,#newemail,#newlastname,#newpassword,#newpasswordconfirm', 'keyup', (ev) => {
  userCreateEnable()
})
JH.event('#usercreate', 'click', (ev) => {
  userCreate()
})
JH.event('#editlogin,#editemail,#editlastname', 'keyup', (ev) => {
  userEditEnable()
})
JH.event('#useredit', 'click', (ev) => {
  userEdit()
})
JH.event('#newuser', 'click', (ev) => {
  userCreateDialog()
})
JH.event('#newuserdialog #cancel', 'click', (ev) => {
  JH.query('#newuserdialog').hide()
})
JH.event('#usersearch', 'sl-input', (ev) => {
  if (userSearchTimeout) {
    clearTimeout(userSearchTimeout)
  }
  userSearchTimeout = setTimeout(() => {
    JH.query('#groupstable tbody').innerHTML = ''
    fillUsers()
  }, 250)
})
JH.event('#addgroup', 'click', (ev) => {
  if (currentUser === '') {
    PW.errorDialog('Select a user from the list')
    return
  }
  GPicker.show(groupPickerChoosen)
})

JH.event('#useractivityload', 'click', (ev) => {
  fillActivity(currentUser)
})

JH.event('#copygroups', 'click', (ev) => {
  groupsCopy()
})

JH.event('#pastegroups', 'click', (ev) => {
  groupsPaste()
})

JH.event('#replacegroups', 'click', (ev) => {
  groupsReplace()
})
