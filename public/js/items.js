/* global addEventListener */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'
import * as Folders from './folders_shared.js'
import * as UPicker from './userpicker.js'

let itemSearchTimeout
let itemTypesOptions

async function fillItemTypes () {
  const resp = await JH.http('/api/itemtypes')
  if (!await PW.checkResponse(resp)) {
    return
  }

  itemTypesOptions = ''
  const body = await resp.json()
  for (const itm of body.data) {
    itemTypesOptions += `<sl-option id='itemtype-${itm.id}' value='${itm.id}'>${itm.description}`
    if (itm.icon) {
      itemTypesOptions += `<sl-icon name='${itm.icon}' slot='prefix'>${itm.description}</sl-icon>`
    }
    itemTypesOptions += '</sl-option>'
  }

  JH.query('#viewtype').innerHTML = itemTypesOptions
  JH.query('#edittype').innerHTML = itemTypesOptions
  JH.query('#newtype').innerHTML = itemTypesOptions
  JH.query('#typesearch').innerHTML = itemTypesOptions
}

async function fillItems () {
  const search = JH.value('#itemsearch')
  const type = JH.value('#typesearch')

  PW.setTableLoading('#itemstable')

  const resp = await JH.http(`/api/itemslist/${Folders.currentFolder()}?search=${search}&type=${type}`)

  // Folder may not be accessible
  if (!await PW.checkResponse(resp, [403, 412, 417])) {
    return
  }

  const body = await resp.json()
  // Personal password not yet created?
  if (body.httpStatusCode === 412) {
    Folders.currentPermissions.read = false
    Folders.currentPermissions.write = false
    personalPasswordCreateDialog()
    return
  }

  // Personal password not yet set?
  if (body.httpStatusCode === 417) {
    Folders.currentPermissions.read = false
    Folders.currentPermissions.write = false
    personalPasswordAskDialog()
    return
  }

  // Manual check response, because body has already been read
  if (body.data.length) {
    let row = ''
    for (const itm of body.data) {
      row += `<tr id='row-${itm.id}' data-id='${itm.id}'>`
      row += '<td class="border-end">'
      row += `<sl-icon-button id='view-${itm.id}' name='file-earmark' title='View item' data-id='${itm.id}'></sl-icon-button>`
      if (Folders.currentPermissions.write) {
        row += `<sl-icon-button id='edit-${itm.id}' title='Edit item' name='pencil' data-id='${itm.id}'></sl-icon-button>`
        row += `<sl-icon-button id='remove-${itm.id}' title='Remove item' name='trash3' style="color:red;" data-id='${itm.id}'></sl-icon-button>`
        row += `<sl-icon-button id='clone-${itm.id}' title='Clone item' name='journal-plus' data-id='${itm.id}'></sl-icon-button>`
      }
      row += `<sl-icon-button id='link-${itm.id}' title='Copy item link' name='link-45deg' data-id='${itm.id}'></sl-icon-button>`
      row += `<sl-icon-button id='onetime-${itm.id}' title='Share once' name='1-circle' data-id='${itm.id}'></sl-icon-button>`
      row += `<sl-icon-button id='activity-${itm.id}' title='Activity' name='clock-history' data-id='${itm.id}'></sl-icon-button>`
      row += '</td>'
      row += '<td class="border-end">'
      if (itm.type) {
        row += `<sl-icon name='${itm.itemtype.icon}' title='${itm.itemtype.description}'></sl-icon>`
      }
      row += `<td id='title-${itm.id}' data-id='${itm.id}' class='border-start border-end itemtitle'>${itm.title}</td>`
      row += `<td id='user-${itm.id}'>${itm.metadata}</td>`
      row += `<td class='border-end'><sl-copy-button title='Copy user to clipboard' from='user-${itm.id}'></sl-copy-button></td>`
      row += `<td id='password-${itm.id}'>****</td>`
      row += `<td><sl-copy-button id='passwordcopy-${itm.id}' title='Copy password to clipboard' data-id='${itm.id}' from='password-${itm.id}'></sl-copy-button></td>`
      row += `<td><sl-icon-button id='passwordshow-${itm.id}' title='Show/hide password' data-id='${itm.id}' name='eye'></sl-icon-button></td>`
      row += '</tr>'
    }
    JH.query('#itemstable tbody').innerHTML = row
  } else {
    JH.query('#itemstable tbody').innerHTML = '<tr><td colspan="99">No item found</td></tr>'
  }

  // Install event handlers
  JH.event('#itemstable tbody [id^=view]', 'click', (ev) => {
    itemShow(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#itemstable tbody [id^=edit]', 'click', (ev) => {
    itemEditDialog(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#itemstable tbody [id^=title]', 'dblclick', (ev) => {
    itemShow(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#itemstable tbody [id^=remove]', 'click', (ev) => {
    itemRemove(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#itemstable tbody [id^=clone]', 'click', (ev) => {
    itemClone(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#itemstable tbody [id^=link]', 'click', (ev) => {
    itemCopyLink(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#itemstable tbody [id^=activity]', 'click', (ev) => {
    itemActivity(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#itemstable tbody [id^=onetime]', 'click', (ev) => {
    itemOneTimeShareDialog(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#itemstable tbody [id^=passwordcopy]', 'click', (ev) => {
    passwordCopy(ev)
  })
  JH.event('#itemstable tbody [id^=passwordshow]', 'click', (ev) => {
    passwordShow(ev)
  })

  // Folder cannot be removed if not empty
  if (JH.query("#itemstable [id^='row-']")) {
    JH.query('#folderremove').setAttribute('disabled', 'disabled')
  }

  // Setup drag'n'drop
  JH.draggable("#itemstable [id^='row-']", 'item')
}

async function fillActivity (itm) {
  // If a table is already populated, get last id and get next page
  let lastid = ''
  const lastrow = JH.query('#itemactivitytable tbody tr:last-child td[id^=event]')
  if (lastrow) {
    lastid = lastrow.getAttribute('data-id')
  }

  const resp = await JH.http(`/api/items/${itm}/activity?lastid=${lastid}`)

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
      row += `<td>${evt.user_description || ''}</td>`
      row += `<td>${evt.action_description || ''}</td>`
      row += `<td>${evt.note || ''}</td>`
    }
    JH.query('#itemactivitytable tbody').innerHTML += row
  } else {
    JH.query('#itemactivitytable tbody').innerHTML += '<tr><td colspan="99">No other activity found</td></tr>'
    JH.query('#itemactivityload').setAttribute('disabled', 'disabled')
  }
}

async function folderClicked () {
  PW.setTableLoading('#itemstable')

  // Read folder info
  JH.value('#typesearch', '')
  const resp = await JH.http(`/api/folders/${Folders.currentFolder()}`)

  // Folder may not be accessible
  if (!await PW.checkResponse(resp, 403)) {
    return
  }

  const body = await resp.json()
  if (body.data && body.data.permissions) {
    Folders.currentPermissions.read = body.data.permissions.read
    Folders.currentPermissions.write = body.data.permissions.write
    JH.query('#sectiontitle').innerHTML = `${body.data.description} - Items`
  } else {
    Folders.currentPermissions.read = false
    Folders.currentPermissions.write = false
    JH.query('#sectiontitle').innerHTML = 'Items'
  }

  let cp = ['danger', 'No access', 'No access']
  if (Folders.currentPermissions.read) {
    cp = ['warning', 'R', 'Read only']
  }
  if (Folders.currentPermissions.write) {
    cp = ['success', 'RW ', 'Read and write']
  }
  JH.query('#currentpermissions').setAttribute('variant', cp[0])
  JH.query('#currentpermissions').setAttribute('title', cp[2])
  JH.query('#currentpermissions').innerHTML = cp[1]

  // Load items
  if (Folders.currentPermissions.read) {
    await fillItems()
  }

  if (Folders.currentPermissions.write) {
    JH.query('#newitem').removeAttribute('disabled')
    JH.query('#foldercreate').removeAttribute('disabled')
    JH.query('#folderremove').removeAttribute('disabled')
    JH.query('#folderedit').removeAttribute('disabled')
  } else {
    JH.query('#newitem').setAttribute('disabled', 'disabled')
    JH.query('#foldercreate').setAttribute('disabled', 'disabled')
    JH.query('#folderremove').setAttribute('disabled', 'disabled')
    JH.query('#folderedit').setAttribute('disabled', 'disabled')
  }
}

function itemCreateDialog () {
  JH.query('#itemcreatedialog').show()
  JH.value('#itemcreatedialog sl-input,sl-textarea,sl-select', '')

  JH.query('#newpassword').passwordVisible = false

  itemCreateEnable()
}

async function itemCreate () {
  JH.query('#itemcreatedialog').hide()

  const itemdata = {
    _csrf: PW.getCSRFToken(),
    type: JH.value('#newtype'),
    title: JH.value('#newtitle'),
    email: JH.value('#newemail'),
    description: JH.value('#newdescription'),
    url: JH.value('#newurl'),
    user: JH.value('#newuser'),
    password: JH.value('#newpassword')
  }

  const resp = await JH.http(`/api/itemnew/${Folders.currentFolder()}`, itemdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.data.id) {
    await fillItems()
    PW.showToast('success', 'Item created')
  } else {
    PW.errorDialog(body.message)
  }
}

function itemCreateEnable () {
  if (JH.value('#newtitle') === '') {
    JH.query('#itemcreatesave').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#itemcreatesave').removeAttribute('disabled')
  }
}

async function itemRemove (itm) {
  PW.confirmDialog('Delete item', 'Are you sure you want to delete this item?', async () => {
    const resp = await JH.http(`/api/itemremove/${itm}`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    await fillItems()
    PW.showToast('success', 'Item deleted')
  }, 'Delete', 'danger')
}

async function itemEditDialog (item) {
  JH.value('#itemeditdialog sl-input,sl-textarea,sl-select', '')
  JH.query('#itemeditdialog').show()
  JH.query('#editpassword').setAttribute('type', 'password')

  itemEditFill(item)
  itemEditEnable()
}

async function itemEditFill (item) {
  const resp = await JH.http(`/api/items/${item}`)
  if (!await PW.checkResponse(resp)) {
    JH.query('#itemeditdialog').hide()
    return
  }

  JH.query('#editpassword').passwordVisible = false

  const body = await resp.json()
  body.data.data = JSON.parse(body.data.data)
  if (body.status === 'success') {
    JH.value('#itemeditid', item)
    JH.value('#edittype', body.data.type)
    JH.value('#edittitle', body.data.title)
    JH.value('#editemail', body.data.data.email)
    JH.value('#editdescription', body.data.data.description)
    JH.value('#editurl', body.data.data.url)
    JH.value('#edituser', body.data.data.user)
    JH.value('#editpassword', body.data.data.password)
  }

  itemEditEnable()
}

function itemEditEnable () {
  if (JH.value('#edittitle') === '') {
    JH.query('#itemeditsave').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#itemeditsave').removeAttribute('disabled')
  }
}

async function itemEdit () {
  const id = JH.value('#itemeditid')

  const itemdata = {
    _csrf: PW.getCSRFToken(),
    title: JH.value('#edittitle'),
    type: JH.value('#edittype'),
    data: {
      description: JH.value('#editdescription'),
      email: JH.value('#editemail'),
      url: JH.value('#editurl'),
      user: JH.value('#edituser'),
      password: JH.value('#editpassword')
    }
  }

  JH.query('#itemeditdialog').hide()
  const resp = await JH.http(`/api/itemupdate/${id}`, itemdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Item saved')
  await fillItems()
}

async function itemViewFill (item, gotofolder) {
  const resp = await JH.http(`/api/items/${item}`)
  if (!await PW.checkResponse(resp)) {
    JH.query('#itemviewdialog').hide()
    return
  }

  const body = await resp.json()
  body.data.data = JSON.parse(body.data.data)
  JH.value('#itemviewid', item)
  JH.value('#viewtitle', body.data.title)
  JH.value('#viewtype', body.data.type)
  JH.value('#viewemail', body.data.data.email)
  JH.value('#viewdescription', body.data.data.description)
  JH.value('#viewurl', body.data.data.url)
  JH.value('#viewuser', body.data.data.user)
  JH.value('#viewpassword', body.data.data.password)
  JH.query('#viewpassword').setAttribute('type', 'password')

  if (gotofolder) {
    PW.treeItemSelect(`item-${body.data.folderid}`)
    await folderClicked()
  }
}

function itemShow (item) {
  if (window.getSelection()) {
    window.getSelection().empty()
  }
  JH.value('#itemviewdialog sl-input,sl-textarea,sl-select', '')
  JH.query('#itemviewdialog').show()

  JH.query('#viewpassword').passwordVisible = false

  itemViewFill(item)
}

async function itemClone (itm) {
  PW.confirmDialog('Clone item', 'Do you want to clone this item?', async () => {
    const resp = await JH.http(`/api/items/${itm}/clone`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    const body = await resp.json()

    PW.showToast('success', 'Item successfully cloned')
    await fillItems()
    itemEditDialog(body.data.id)
  })
}

function itemCopyLink (itm) {
  navigator.clipboard.writeText(`${window.location.origin}/pages/items?viewitem=${itm}`)
  PW.showToast('primary', 'Item link copied to clipboard')
}

async function itemMove (id, folder) {
  const itemdata = {
    _csrf: PW.getCSRFToken(),
    folder
  }

  const resp = await JH.http(`/api/itemmove/${id}`, itemdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Item moved')
  await fillItems()
}

function enableShareSave () {
  if (JH.value('#scope') === '2' && JH.value('#scopeuser') === '') {
    JH.query('#sharesave').setAttribute('disabled', 'disabled')
    return
  }
  JH.query('#sharesave').removeAttribute('disabled')
}

async function itemOneTimeShareDialog (itm) {
  JH.query('#scopeselect').show()
  JH.value('#scope', '1')
  JH.value('#shareitemid', itm)
  showScopeUser()
  enableShareSave()
}

async function itemOneTimeShare () {
  const data = {
    _csrf: PW.getCSRFToken(),
    scope: JH.value('#scope'),
    userid: JH.value('#scopeuser'),
    itemid: JH.value('#shareitemid')
  }
  const resp = await JH.http('/api/onetimeshare', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  navigator.clipboard.writeText(`${window.location.origin}/onetimesecret/${body.data.token}`)

  PW.showToast('primary', 'One time share link copied to clipboard')
  JH.query('#scopeselect').hide()
}

function findAndShowItem (itm) {
  itemViewFill(itm, true)
  JH.query('#itemviewdialog').show()
}

function personalPasswordCreateDialog () {
  JH.query('#personalpasswordnew').show()
}

function personalPasswordAskDialog () {
  JH.query('#personalpasswordset').show()
}

function personalPasswordCreateEnable () {
  if (JH.value('#newpersonalpassword') === '' || JH.value('#newpersonalpassword').length < 8 || JH.value('#newpersonalpassword') !== JH.value('#newpersonalpasswordconfirm')) {
    JH.query('#personalpasswordcreate').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#personalpasswordcreate').removeAttribute('disabled')
  }
}

async function personalPasswordCreate () {
  const data = {
    _csrf: PW.getCSRFToken(),
    password: JH.value('#newpersonalpassword')
  }

  const resp = await JH.http('/api/personalpassword', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  JH.query('#personalpasswordnew').hide()

  PW.showToast('success', 'Personal password saved')
  await fillItems()
}

async function personalPasswordSet () {
  const data = {
    _csrf: PW.getCSRFToken(),
    password: JH.value('#personalpasswordask')
  }

  JH.query('#personalpasswordset').hide()
  const resp = await JH.http('/api/personalunlock', data)
  if (!await PW.checkResponse(resp)) {
    PW.errorDialog('Wrong password, please retry')
    return
  }

  PW.showToast('success', 'Personal folder unlocked')
  await fillFolders()
  await folderClicked()
}

async function passwordCopy (ev) {
  const item = ev.currentTarget.getAttribute('data-id')

  const resp = await JH.http(`/api/items/${item}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  body.data.data = JSON.parse(body.data.data)
  navigator.clipboard.writeText(body.data.data.password)

  passwordCopied(item)
}

async function passwordShow (ev) {
  const item = ev.currentTarget.getAttribute('data-id')

  if (JH.query(`#password-${item}`).innerHTML !== '****') {
    JH.query(`#password-${item}`).innerHTML = '****'
    return
  }

  const resp = await JH.http(`/api/items/${item}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  body.data.data = JSON.parse(body.data.data)
  JH.query(`#password-${item}`).innerHTML = body.data.data.password

  passwordAccessed(item)
}

async function passwordAccessed (item) {
  await JH.http('/api/events', {
    _csrf: PW.getCSRFToken(),
    event: 80,
    entity: 30,
    entityid: item
  })
}

async function passwordCopied (item) {
  await JH.http('/api/events', {
    _csrf: PW.getCSRFToken(),
    event: 81,
    entity: 30,
    entityid: item
  })
}

async function fillFolders () {
  PW.setTreeviewLoading('#folderstree')

  const resp = await JH.http(`/api/users/${PW.getUser()}/folders`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (JH.query('#viewitem')) {
    // Avoid loading from local.storage if viewitem exists
    PW.treeFill('folderstree', body.data, folderClicked, false)
  } else {
    PW.treeFill('folderstree', body.data, folderClicked, true)
  }
  await dndSetup()
}

async function itemCreateGeneratePassword () {
  const resp = await JH.http('/api/generatepassword')
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    JH.value('#newpassword', body.data.password)
  }
}

async function itemActivity (itm) {
  JH.query('#itemactivitytable tbody').innerHTML = ''
  JH.query('#itemactivitydialog').show()
  JH.value('#itemactivityid', itm)
  JH.query('#itemactivityload').removeAttribute('disabled')
  fillActivity(itm)
}

// Drag'n'drop
async function dndSetup () {
  JH.draggable('sl-tree-item', 'folder')
  JH.dropTarget('sl-tree-item', async (ev, data) => {
    const newparent = ev.target.getAttribute('data-id')

    if (data.type === 'folder') {
      const folder = data.data
      await Folders.folderMove(folder, newparent)
    }
    if (data.type === 'item') {
      const item = data.data
      await itemMove(item, newparent)
    }
  })
}

// Search
JH.event('#typesearch', 'sl-change', () => {
  fillItems()
})

// Create
JH.event('#newitem', 'click', (ev) => {
  itemCreateDialog()
})
JH.event('#itemcreatecancel', 'click', (ev) => {
  JH.query('#itemcreatedialog').hide()
})
JH.event('#itemcreatesave', 'click', (ev) => {
  itemCreate()
})

// View
JH.event('#newtitle', 'keyup', (ev) => {
  itemCreateEnable()
})

// Edit
JH.event('#edittitle', 'keyup', (ev) => {
  itemEditEnable()
})
JH.event('#itemeditcancel', 'click', (ev) => {
  JH.query('#itemeditdialog').hide()
})
JH.event('#itemeditsave', 'click', (ev) => {
  itemEdit()
})

// Personal
JH.event('#personalpasswordcancel', 'click', (ev) => {
  JH.query('#personalpasswordnew').hide()
})
JH.event('#personalpasswordsetcancel', 'click', (ev) => {
  JH.query('#personalpasswordset').hide()
})
JH.event('#personalpasswordcreate', 'click', (ev) => {
  personalPasswordCreate()
})
JH.event('#newpersonalpassword,#newpersonalpasswordconfirm', 'keyup', (ev) => {
  personalPasswordCreateEnable()
})

JH.event('#personalpasswordsetbutton', 'click', (ev) => {
  personalPasswordSet()
})

JH.event('#itemsearch', 'sl-input', (ev) => {
  if (itemSearchTimeout) {
    clearTimeout(itemSearchTimeout)
  }
  itemSearchTimeout = setTimeout(async () => { fillItems() }, 250)
})

JH.event('#itemviewcopypassword', 'sl-copy', (ev) => {
  passwordCopied(JH.value('#itemviewid'))
})

JH.event('#itemviewcopylink', 'click', (ev) => {
  itemCopyLink(JH.value('#itemviewid'))
})

JH.event('#itemeditcopylink', 'click', (ev) => {
  itemCopyLink(JH.value('#itemeditid'))
})

JH.event('#newgenerate', 'click', (ev) => {
  itemCreateGeneratePassword()
})

if (JH.query('#viewitem')) {
  setTimeout(() => { findAndShowItem(JH.value('#viewitem')) }, 200)
}

addEventListener('folders-refresh', async (ev) => {
  await fillFolders()
})

addEventListener('pw-item-found', async (ev) => {
  folderClicked()
})

JH.event('#itemviewactivity', 'click', (ev) => {
  itemActivity(JH.value('#itemviewid'))
})

JH.event('#itemeditactivity', 'click', (ev) => {
  itemActivity(JH.value('#itemeditid'))
})

JH.event('#itemactivityload', 'click', (ev) => {
  fillActivity(JH.value('#itemactivityid'))
})

await fillFolders()
await fillItemTypes()

JH.query('#viewpassword').shadowRoot.querySelector('[part=password-toggle-button]').addEventListener('click', (ev) => {
  const el = JH.query('#viewpassword').shadowRoot.querySelector('[part=input]')
  if (el.getAttribute('type') === 'text') {
    passwordAccessed(JH.value('#itemviewid'))
  }
})

JH.query('#editpassword').shadowRoot.querySelector('[part=password-toggle-button]').addEventListener('click', (ev) => {
  const el = JH.query('#editpassword').shadowRoot.querySelector('[part=input]')
  if (el.getAttribute('type') === 'text') {
    passwordAccessed(JH.value('#itemeditid'))
  }
})

function showScopeUser () {
  if (JH.value('#scope') === '2') {
    JH.query('#selectuser').style.visibility = 'visible'
  } else {
    JH.query('#selectuser').style.visibility = 'hidden'
    JH.value('#scopeuser', '')
    JH.value('#scopeuserdesc', '')
  }
}

JH.event('#scope', 'sl-change', (ev) => {
  showScopeUser()
  enableShareSave()
})

JH.event('#sharesave', 'click', (ev) => {
  itemOneTimeShare()
})

function userChoosen (userid, userdesc) {
  JH.value('#scopeuser', userid)
  JH.value('#scopeuserdesc', userdesc)
  UPicker.hide()
  enableShareSave()
}

JH.event('#searchuser', 'click', (ev) => {
  UPicker.show(userChoosen)
})
