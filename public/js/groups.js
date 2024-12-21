/* global location, addEventListener */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'
import * as UPicker from './userpicker.js'

let groupSearchTimeout

function currentGroup () {
  try {
    return JH.query('sl-tree-item[selected]').getAttribute('data-id')
  } catch (err) {
    return ''
  }
}

async function fillUsers () {
  JH.query('#userstable tbody').innerHTML = ''

  const resp = await fetch(`/api/userslist/${currentGroup()}`)

  if (!await PW.checkResponse(resp)) {
    return
  }
  const body = await resp.json()

  if (body.data.length) {
    let row = ''
    for (const usr of body.data) {
      row += '<tr>'
      if (currentGroup() !== 'E') {
        row += `<td><sl-icon-button id='remove-${usr.id}' title='Remove' data-id='${usr.id}' name='trash3' style='color:red;'></sl-icon-button></td>`
      } else {
        row += '<td></td>'
      }
      row += `<td class='border-start border-end'>${usr.login}</td>` +
      `<td>${usr.lastname}</td>` +
      `<td>${usr.firstname}</td>`
    }
    JH.query('#userstable tbody').innerHTML = row

    // Install event handlers
    JH.event('#userstable tbody [id^=remove]', 'click', (ev) => {
      groupRemoveUser(ev.currentTarget.getAttribute('data-id'))
    })
  } else {
    JH.query('#userstable tbody').innerHTML = '<tr><td colspan="99">No user in this group</td></tr>'
  }

  // Group cannot be removed if not empty
  if (body.data.length) {
    JH.query('#groupremove').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#groupremove').removeAttribute('disabled')
  }
}

async function groupClicked (groupid) {
  fillUsers()
  if (groupid === '0' || groupid === 'E') {
    JH.query('#newmember').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#newmember').removeAttribute('disabled')
  }

  const resp = await JH.http(`/api/groups/${currentGroup()}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  JH.query('#sectiontitle').innerHTML = `${body.data.description} - Members`
}

function groupCreateEnable () {
  if (JH.value('#groupcreatedescription') === '') {
    JH.query('#groupcreatesave').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#groupcreatesave').removeAttribute('disabled')
  }
}

function groupCreateDialog () {
  JH.value('#groupcreatedialog sl-input,sl-textarea', '')
  groupCreateEnable()
  JH.query('#groupcreatedialog').show()
}

async function groupCreate () {
  const userdata = {
    _csrf: PW.getCSRFToken(),
    description: JH.value('#groupcreatedescription')
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
  JH.query('#groupeditdialog').show()
}

async function groupEditFill () {
  const resp = await JH.http(`/api/groups/${currentGroup()}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    JH.value('#groupeditdescription', body.data.description)
    groupEditEnable()
  }
}

async function groupEdit () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: JH.value('#groupeditdescription')
  }

  const resp = await JH.http(`/api/groupupdate/${currentGroup()}`, data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  location.reload()
}

function groupEditEnable () {
  if (JH.value('#groupeditdescription') === '') {
    JH.query('#groupeditsave').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#groupeditsave').removeAttribute('disabled')
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
  JH.query('#groupstree').innerHTML = ''
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

  JH.query('#generictree').innerHTML = 'Loading...'
  JH.query('#folderstreedialog').show()
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
JH.event('#groupremove', 'click', (ev) => {
  groupRemove()
})
JH.event('#groupedit', 'click', (ev) => {
  groupEditDialog()
})
JH.event('#groupcreate', 'click', (ev) => {
  groupCreateDialog()
})

JH.event('#groupcreatedescription', 'keyup', (ev) => {
  groupCreateEnable()
})
JH.event('#groupcreatesave', 'click', (ev) => {
  groupCreate()
})
JH.event('#groupcreatecancel', 'click', (ev) => {
  JH.query('#groupcreatedialog').hide()
})

JH.event('#groupeditdescription', 'keyup', (ev) => {
  groupEditEnable()
})
JH.event('#groupeditsave', 'click', (ev) => {
  groupEdit()
})
JH.event('#groupeditcancel', 'click', (ev) => {
  JH.query('#groupeditdialog').hide()
})

JH.event('#newmember', 'click', (ev) => {
  if (currentGroup() === '') {
    PW.errorDialog('Select a group in the tree')
    return
  }
  UPicker.show(userPickerChoosen)
})

JH.event('#groupsearch', 'sl-input', (ev) => {
  if (groupSearchTimeout) {
    clearTimeout(groupSearchTimeout)
  }
  groupSearchTimeout = setTimeout(() => {
    const search = JH.value('#groupsearch')
    if (!PW.treeSearch('groupstree', search)) {
      PW.showToast('danger', 'Not found')
    }
  }, 250)
})
JH.event('#groupsearchnext', 'click', (ev) => {
  const search = JH.value('#groupsearch')
  PW.treeSearchNext('groupstree', search)
})

JH.event('#groupsearchprevious', 'click', (ev) => {
  const search = JH.value('#groupsearch')
  PW.treeSearchPrevious('groupstree', search)
})

JH.event('#groupfolders', 'click', (ev) => {
  showGroupFolders()
})

addEventListener('pw-item-found', async (ev) => {
  await fillUsers()
})
