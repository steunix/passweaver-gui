/* global jhEvent, jhQuery, jhValue, jhFetch, jhQueryAll, jhDraggable, jhDropTarget, location, addEventListener */

import * as PW from './passweaver-gui.js'
import * as UPicker from './userpicker.js'

let groupSearchTimeout

function currentGroup () {
  try {
    return jhQuery('sl-tree-item[selected]').getAttribute('data-id')
  } catch (err) {
    return ''
  }
}

async function fillUsers () {
  jhQuery('#userstable tbody').innerHTML = ''

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
    jhQuery('#userstable tbody').innerHTML = row

    // Install event handlers
    jhEvent('#userstable tbody [id^=remove]', 'click', (ev) => {
      groupRemoveUser(ev.currentTarget.getAttribute('data-id'))
    })
  } else {
    jhQuery('#userstable tbody').innerHTML = '<tr><td colspan="99">No user in this group</td></tr>'
  }

  // Group cannot be removed if not empty
  if (body.data.length) {
    jhQuery('#groupremove').setAttribute('disabled', 'disabled')
  } else {
    jhQuery('#groupremove').removeAttribute('disabled')
  }
}

async function groupClicked (groupid) {
  fillUsers()
  if (groupid === '0' || groupid === 'E') {
    jhQuery('#newmember').setAttribute('disabled', 'disabled')
  } else {
    jhQuery('#newmember').removeAttribute('disabled')
  }

  const resp = await jhFetch(`/api/groups/${currentGroup()}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  jhQuery('#sectiontitle').innerHTML = `${body.data.description} - Members`
}

function groupCreateEnable () {
  if (jhValue('#groupcreatedescription') === '') {
    jhQuery('#groupcreatesave').setAttribute('disabled', 'disabled')
  } else {
    jhQuery('#groupcreatesave').removeAttribute('disabled')
  }
}

function groupCreateDialog () {
  jhValue('#groupcreatedialog sl-input,sl-textarea', '')
  groupCreateEnable()
  jhQuery('#groupcreatedialog').show()
}

async function groupCreate () {
  const userdata = {
    _csrf: PW.getCSRFToken(),
    description: jhValue('#groupcreatedescription')
  }

  const resp = await jhFetch(`/api/groupnew/${currentGroup()}`, userdata)
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
    const resp = await jhFetch(`/api/groupremove/${currentGroup()}`, { _csrf: PW.getCSRFToken() })

    if (!await PW.checkResponse(resp)) {
      return
    }

    location.reload()
  })
}

function groupEditDialog () {
  groupEditFill()
  jhQuery('#groupeditdialog').show()
}

async function groupEditFill () {
  const resp = await jhFetch(`/api/groups/${currentGroup()}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    jhValue('#groupeditdescription', body.data.description)
    groupEditEnable()
  }
}

async function groupEdit () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: jhValue('#groupeditdescription')
  }

  const resp = await jhFetch(`/api/groupupdate/${currentGroup()}`, data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  location.reload()
}

function groupEditEnable () {
  if (jhValue('#groupeditdescription') === '') {
    jhQuery('#groupeditsave').setAttribute('disabled', 'disabled')
  } else {
    jhQuery('#groupeditsave').removeAttribute('disabled')
  }
}

async function userPickerChoosen (id) {
  UPicker.hide()
  const resp = await jhFetch(`/api/groupadduser/${currentGroup()}/${id}`, { _csrf: PW.getCSRFToken() })
  if (!await PW.checkResponse(resp)) {
    return
  }

  fillUsers()
  PW.showToast('success', 'User added to the group')
}

async function groupRemoveUser (id) {
  PW.confirmDialog('Remove user from group', 'Are you sure you want to remove the user from the group?', async () => {
    const resp = await jhFetch(`/api/groupremoveuser/${currentGroup()}/${id}`, { _csrf: PW.getCSRFToken() })
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

  const resp = await jhFetch(`/api/groupupdate/${id}`, data)
  if (!await PW.checkResponse(resp)) {
    const items = jhQueryAll('sl-tree-item')
    for (const item of items) {
      item.classList.remove('dragover')
    }
    return
  }

  location.reload()
}

async function fillGroups () {
  jhQuery('#groupstree').innerHTML = ''
  const resp = await fetch('/api/groupstree')
  if (await PW.checkResponse(resp)) {
    const body = await resp.json()
    PW.treeFill('groupstree', body.data, null, groupClicked)
    await dndSetup()
  }
}

await fillGroups()

// Drag'n'drop
async function dndSetup () {
  jhDraggable('sl-tree-item')
  jhDropTarget('sl-tree-item', async (ev, data) => {
    const group = data.data
    const newparent = ev.target.getAttribute('data-id')

    await groupMove(group, newparent)
  })
}

// Event handlers
jhEvent('#groupremove', 'click', (ev) => {
  groupRemove()
})
jhEvent('#groupedit', 'click', (ev) => {
  groupEditDialog()
})
jhEvent('#groupcreate', 'click', (ev) => {
  groupCreateDialog()
})

jhEvent('#groupcreatedescription', 'keyup', (ev) => {
  groupCreateEnable()
})
jhEvent('#groupcreatesave', 'click', (ev) => {
  groupCreate()
})
jhEvent('#groupcreatecancel', 'click', (ev) => {
  jhQuery('#groupcreatedialog').hide()
})

jhEvent('#groupeditdescription', 'keyup', (ev) => {
  groupEditEnable()
})
jhEvent('#groupeditsave', 'click', (ev) => {
  groupEdit()
})
jhEvent('#groupeditcancel', 'click', (ev) => {
  jhQuery('#groupeditdialog').hide()
})

jhEvent('#newmember', 'click', (ev) => {
  if (currentGroup() === '') {
    PW.errorDialog('Select a group in the tree')
    return
  }
  UPicker.show(userPickerChoosen)
})

jhEvent('#groupsearch', 'sl-input', (ev) => {
  if (groupSearchTimeout) {
    clearTimeout(groupSearchTimeout)
  }
  groupSearchTimeout = setTimeout(() => {
    const search = jhValue('#groupsearch')
    if (!PW.treeSearch('groupstree', search)) {
      PW.showToast('danger', 'Not found')
    }
  }, 250)
})
jhEvent('#groupsearchnext', 'click', (ev) => {
  const search = jhValue('#groupsearch')
  PW.treeSearchNext('groupstree', search)
})

jhEvent('#groupsearchprevious', 'click', (ev) => {
  const search = jhValue('#groupsearch')
  PW.treeSearchPrevious('groupstree', search)
})

addEventListener('pw-item-found', async (ev) => {
  await fillUsers()
})
