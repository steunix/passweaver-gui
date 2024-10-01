/* global jhEvent, jhQuery, jhValue, jhFetch, jhQueryAll, localStorage */

import * as PW from './passweaver-gui.js'
import * as GPicker from './grouppicker.js'

let userSearchTimeout
let currentUser = ''

async function fillUsers () {
  const search = jhValue('#usersearch')
  const resp = await jhFetch(`/api/userslist?search=${search}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()

  jhQuery('#groupstable tbody').innerHTML = ''
  jhQuery('#userstable tbody').innerHTML = ''

  if (body.data.length) {
    let row = ''
    for (const itm of body.data) {
      row +=
        `<tr data-id='${itm.id}' style='cursor:pointer'>` +
        '<td>' +
        `<sl-icon-button id='edituser-${itm.id}' title='Edit user' name='pencil' data-id='${itm.id}'></sl-icon-button>` +
        `<sl-icon-button id='removeuser-${itm.id}' title='Delete user' name='trash3' style='color:red;' data-id='${itm.id}'></sl-icon-button>` +
        `<sl-icon-button id='activity-${itm.id}' title='Activity' name='clock-history' data-id='${itm.id}'></sl-icon-button>` +
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
    jhQuery('#userstable tbody').innerHTML = row

    // Install event handlers
    jhEvent('#userstable tbody tr', 'dblclick', (ev) => {
      userDoubleClicked(ev.currentTarget.getAttribute('data-id'))
    })
    jhEvent('#userstable tbody tr [id^=edituser]', 'click', (ev) => {
      userEditDialog(ev.currentTarget.getAttribute('data-id'))
    })
    jhEvent('#userstable tbody tr [id^=removeuser]', 'click', (ev) => {
      userRemove(ev.currentTarget.getAttribute('data-id'))
    })
    jhEvent('#userstable tbody tr [id^=activity]', 'click', (ev) => {
      userActivity(ev.currentTarget.getAttribute('data-id'))
    })
    jhEvent('#userstable tbody tr', 'click', (ev) => {
      currentUser = ev.currentTarget.getAttribute('data-id')

      const sel = jhQuery('#userstable tbody tr.rowselected')
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
  const lastrow = jhQuery('#useractivitytable tbody tr:last-child td[id^=event]')
  if (lastrow) {
    lastid = lastrow.getAttribute('data-id')
  }

  const resp = await jhFetch(`/api/users/${usr}/activity?lastid=${lastid}`)

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
      row += `<td>${evt.entity_description}</td>`
      row += `<td>${evt.action_description}</td>`
      row += `<td>${evt.item_title}</td>`
    }
    jhQuery('#useractivitytable tbody').innerHTML += row
  } else {
    jhQuery('#useractivitytable tbody').innerHTML += '<tr><td colspan="99">No other activity found</td></tr>'
    jhQuery('#useractivityload').setAttribute('disabled', 'disabled')
  }
}

async function fillGroups () {
  jhQuery('#groupstable tbody').innerHTML = ''

  const resp = await jhFetch(`/api/usergroups/${currentUser}`)
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
    jhQuery('#groupstable tbody').innerHTML = row

    // Event handlers
    jhEvent('[id^=removegroup]', 'click', groupRemove)
  } else {
    jhQuery('#groupstable tbody').innerHTML = '<tr><td colspan="99">No group found</td></tr>'
  }
}

function userCreateDialog () {
  jhQuery('#newuserdialog').show()
  jhValue('#newuserdialog sl-input,sl-textarea,sl-select', '')
  userCreateEnable()
}

async function userCreate () {
  const userdata = {
    _csrf: PW.getCSRFToken(),
    login: jhValue('#newlogin'),
    email: jhValue('#newemail'),
    lastname: jhValue('#newlastname'),
    firstname: jhValue('#newfirstname'),
    locale: jhValue('#newlocale'),
    authmethod: jhValue('#newauthmethod'),
    active: jhQuery('#newactive').hasAttribute('checked'),
    secret: jhValue('#newpassword')
  }

  jhQuery('#newuserdialog').hide()
  const resp = await jhFetch('/api/usernew/', userdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  fillUsers()
  PW.showToast('success', 'User created')
}

function userCreateEnable () {
  if (jhValue('#newlogin') === '' || jhValue('#newemail') === '' || jhValue('#newlastname') === '' ||
  jhValue('#newpassword') !== jhValue('#newpasswordconfirm') || jhValue('#newpassword') === '') {
    jhQuery('#usercreate').setAttribute('disabled', 'disabled')
  } else {
    jhQuery('#usercreate').removeAttribute('disabled')
  }
}

async function userRemove (usr) {
  PW.confirmDialog('Delete user', '<strong><span style="color:red;">Are you sure you want to delete this user? Also his personal folder and contained items will be deleted!</span></strong>', async () => {
    const resp = await jhFetch(`/api/userremove/${usr}`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    fillUsers()
    PW.showToast('success', 'User removed')
  }, 'Delete', 'danger')
}

async function userEditFill (user) {
  const resp = await jhFetch(`/api/users/${user}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()

  jhValue('#editlogin', body.data.login)
  jhValue('#editemail', body.data.email)
  jhValue('#editlastname', body.data.lastname)
  jhValue('#editfirstname', body.data.firstname)
  jhValue('#editlocale', body.data.locale)
  jhValue('#editauthmethod', body.data.authmethod)
  if (!body.data.active) {
    jhQuery('#editactive').removeAttribute('checked')
  } else {
    jhQuery('#editactive').setAttribute('checked', 'checked')
  }

  userEditEnable()
}

function userEditEnable () {
  if (jhValue('#editlogin') === '' || jhValue('#editemail') === '' || jhValue('#editlastname') === '') {
    jhQuery('#useredit').setAttribute('disabled', 'disabled')
  } else {
    jhQuery('#useredit').removeAttribute('disabled')
  }
}

function userEditDialog (userid) {
  userEditFill(userid)
  jhQuery('#edituserdialog').show()
}

async function userEdit () {
  const userdata = {
    _csrf: PW.getCSRFToken(),
    login: jhValue('#editlogin'),
    email: jhValue('#editemail'),
    lastname: jhValue('#editlastname'),
    firstname: jhValue('#editfirstname'),
    locale: jhValue('#editlocale'),
    authmethod: jhValue('#editauthmethod'),
    active: jhQuery('#editactive').hasAttribute('checked')
  }

  const resp = await jhFetch(`/api/userupdate/${currentUser}`, userdata)
  jhQuery('#edituserdialog').hide()
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
  jhQuery(`#edituser-${user}`).click()
}

async function groupRemove (ev) {
  const group = ev.currentTarget.getAttribute('data-id')
  PW.confirmDialog('Remove user from group', 'Are you sure you want to remove the user from the group?', async () => {
    const resp = await jhFetch(`/api/groupremoveuser/${group}/${currentUser}`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    fillGroups()
    PW.showToast('success', 'Group removed')
  }, 'Remove', 'danger')
}

async function groupPickerChoosen (group) {
  GPicker.hide()
  const resp = await jhFetch(`/api/groupadduser/${group}/${currentUser}`, { _csrf: PW.getCSRFToken() })
  if (!await PW.checkResponse(resp)) {
    return
  }

  fillGroups()
  PW.showToast('success', 'Group added')
}

async function userActivity (itm) {
  jhQuery('#useractivitytable tbody').innerHTML = ''
  jhQuery('#useractivitydialog').show()
  fillActivity(itm)
}

function groupsCopy () {
  const groups = []
  const list = jhQueryAll('#groupstable tbody tr')

  if (!list.length) {
    localStorage.setItem(`${PW.getUser()}_copiedgroups`, '')
    jhQuery('#pastegroups').style.display = 'none'
    jhQuery('#replacegroups').style.display = 'none'
    return
  }

  for (const el of list) {
    groups.push(el.getAttribute('data-id'))
  }

  if (groups.length) {
    localStorage.setItem(`${PW.getUser()}_copiedgroups`, groups)
    PW.showToast('success', 'Groups copied')
    jhQuery('#pastegroups').style.display = ''
    jhQuery('#replacegroups').style.display = ''
  }
}

async function groupsReplace () {
  PW.confirmDialog('Replace groups', 'Are you sure you want to replace this user\'s groups with the copied ones?', async () => {
    const list = jhQueryAll('#groupstable tbody tr')

    if (!list.length) {
      jhQuery('#pastegroups').style.display = 'none'
      jhQuery('#replacegroups').style.display = 'none'
      return
    }

    for (const el of list) {
      await jhFetch(`/api/groupremoveuser/${el.getAttribute('data-id')}/${currentUser}`, { _csrf: PW.getCSRFToken() })
    }

    for (const el of localStorage.getItem(`${PW.getUser()}_copiedgroups`).split(',')) {
      await jhFetch(`/api/groupadduser/${el}/${currentUser}`, { _csrf: PW.getCSRFToken() })
    }

    fillGroups()
    PW.showToast('success', 'Groups replaced')
  })
}

async function groupsPaste () {
  PW.confirmDialog('Paste groups', 'Are you sure you want to add the copied groups to this user?', async () => {
    for (const el of localStorage.getItem(`${PW.getUser()}_copiedgroups`).split(',')) {
      await jhFetch(`/api/groupadduser/${el}/${currentUser}`, { _csrf: PW.getCSRFToken() })
    }

    fillGroups()
    PW.showToast('success', 'Groups pasted')
  })
}

await fillUsers()

// Event handlers
jhEvent('#newlogin,#newemail,#newlastname,#newpassword,#newpasswordconfirm', 'keyup', (ev) => {
  userCreateEnable()
})
jhEvent('#usercreate', 'click', (ev) => {
  userCreate()
})
jhEvent('#editlogin,#editemail,#editlastname', 'keyup', (ev) => {
  userEditEnable()
})
jhEvent('#useredit', 'click', (ev) => {
  userEdit()
})
jhEvent('#newuser', 'click', (ev) => {
  userCreateDialog()
})
jhEvent('#newuserdialog #cancel', 'click', (ev) => {
  jhQuery('#newuserdialog').hide()
})
jhEvent('#usersearch', 'sl-input', (ev) => {
  if (userSearchTimeout) {
    clearTimeout(userSearchTimeout)
  }
  userSearchTimeout = setTimeout(() => {
    jhQuery('#groupstable tbody').innerHTML = ''
    fillUsers()
  }, 250)
})
jhEvent('#addgroup', 'click', (ev) => {
  if (currentUser === '') {
    PW.errorDialog('Select a user from the list')
    return
  }
  GPicker.show(groupPickerChoosen)
})

jhEvent('#useractivityload', 'click', (ev) => {
  fillActivity(currentUser)
})

jhEvent('#copygroups', 'click', (ev) => {
  groupsCopy()
})

jhEvent('#pastegroups', 'click', (ev) => {
  groupsPaste()
})

jhEvent('#replacegroups', 'click', (ev) => {
  groupsReplace()
})
