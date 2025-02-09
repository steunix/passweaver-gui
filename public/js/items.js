/* global addEventListener */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'
import * as Folders from './folders_shared.js'
import * as UPicker from './userpicker.js'

let itemSearchTimeout
let itemTypesOptions

const domCache = {
  sectionTitle: JH.query('#sectiontitle'),
  currentPermissions: JH.query('#currentpermissions'),
  viewTypeSelect: JH.query('#viewtype'),
  editTypeSelect: JH.query('#edittype'),
  itemSearchText: JH.query('#itemsearch'),
  searchTypeSelect: JH.query('#typesearch'),
  itemsTable: JH.query('#itemstable'),
  itemsTableBody: JH.query('#itemstable tbody'),
  itemActivityDialog: JH.query('#itemactivitydialog'),
  itemActivityTable: JH.query('#itemactivitytable'),
  itemActivityTableBody: JH.query('#itemactivitytable tbody'),
  itemActivityLoadButton: JH.query('#itemactivityload'),
  itemActivityId: JH.query('#itemactivityid'),
  itemActivityButton: JH.query('#itemviewactivity'),
  newItemButton: JH.query('#newitem'),
  folderCreateButton: JH.query('#foldercreate'),
  folderEditButton: JH.query('#folderedit'),
  folderRemoveButton: JH.query('#folderremove'),
  itemCreateDialog: JH.query('#itemcreatedialog'),
  newTitle: JH.query('#newtitle'),
  newTypeSelect: JH.query('#newtype'),
  newType: JH.query('#newtype'),
  newEmail: JH.query('#newemail'),
  newDescription: JH.query('#newdescription'),
  newUrl: JH.query('#newurl'),
  newUser: JH.query('#newuser'),
  newPassword: JH.query('#newpassword'),
  newGenerateButton: JH.query('#newgenerate'),
  itemCreateSaveButton: JH.query('#itemcreatesave'),
  itemCreateCancelButton: JH.query('#itemcreatecancel'),
  itemEditDialog: JH.query('#itemeditdialog'),
  itemEditCancelButton: JH.query('#itemeditcancel'),
  itemEditSaveButton: JH.query('#itemeditsave'),
  editId: JH.query('#itemeditid'),
  editTitle: JH.query('#edittitle'),
  editType: JH.query('#edittype'),
  editEmail: JH.query('#editemail'),
  editDescription: JH.query('#editdescription'),
  editUrl: JH.query('#editurl'),
  editUser: JH.query('#edituser'),
  editPassword: JH.query('#editpassword'),
  editCopyLink: JH.query('#itemeditcopylink'),
  editViewActivity: JH.query('#itemeditactivity'),
  editItemSaveButton: JH.query('#itemeditsave'),
  itemViewDialog: JH.query('#itemviewdialog'),
  viewId: JH.query('#itemviewid'),
  viewTitle: JH.query('#viewtitle'),
  viewType: JH.query('#viewtype'),
  viewEmail: JH.query('#viewemail'),
  viewDescription: JH.query('#viewdescription'),
  viewUrl: JH.query('#viewurl'),
  viewUser: JH.query('#viewuser'),
  viewPassword: JH.query('#viewpassword'),
  viewCopyPassword: JH.query('#itemviewcopypassword'),
  viewCopyLink: JH.query('#itemviewcopylink'),
  scopeSelect: JH.query('#scopeselect'),
  scopeUser: JH.query('#scopeuser'),
  scopeUserDescription: JH.query('#scopeuserdesc'),
  scope: JH.query('#scope'),
  shareItemId: JH.query('#shareitemid'),
  shareSaveButton: JH.query('#sharesave'),
  personalPasswordNewDialog: JH.query('#personalpasswordnew'),
  personalPasswordNewButton: JH.query('#personalpasswordcreate'),
  personalPasswordNew: JH.query('#newpersonalpassword'),
  personalPasswordNewConfirm: JH.query('#newpersonalpasswordconfirm'),
  personalPasswordNewCancel: JH.query('#personalpasswordcancel'),
  personalPasswordSetDialog: JH.query('#personalpasswordset'),
  personalPasswordSetButton: JH.query('#personalpasswordsetbutton'),
  personalPasswordSetCancel: JH.query('#personalpasswordsetcancel'),
  foldersTree: JH.query('#folderstree'),
  viewItem: JH.query('#viewitem'),
  userSearch: JH.query('#searchuser'),
  selectUser: JH.query('#selectuser')
}

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

  domCache.viewTypeSelect.innerHTML = itemTypesOptions
  domCache.editTypeSelect.innerHTML = itemTypesOptions
  domCache.newTypeSelect.innerHTML = itemTypesOptions
  domCache.searchTypeSelect.innerHTML = itemTypesOptions
}

async function fillItems () {
  const search = JH.value(domCache.itemSearchText)
  const type = JH.value(domCache.searchTypeSelect)

  PW.setTableLoading(domCache.itemsTable)

  const resp = await JH.http(`/api/itemslist/${Folders.currentFolder()}?search=${search}&type=${type}`)

  // Folder may not be accessible
  if (!await PW.checkResponse(resp, [403, 412, 417])) {
    domCache.itemsTableBody.innerHTML = '<tr><td colspan="99">No item found</td></tr>'
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
      row += `<sl-icon-button id='onetime-${itm.id}' title='One time share' name='1-circle' data-id='${itm.id}'></sl-icon-button>`
      row += `<sl-icon-button id='activity-${itm.id}' title='Activity' name='clock-history' data-id='${itm.id}'></sl-icon-button>`
      row += '</td>'
      row += '<td class="border-end">'
      if (itm.type) {
        row += `<sl-icon name='${itm.itemtype.icon}' title='${JH.sanitize(itm.itemtype.description)}'></sl-icon>`
      }
      row += `<td id='title-${itm.id}' data-id='${itm.id}' class='border-start border-end itemtitle'>${JH.sanitize(itm.title)}</td>`
      row += `<td id='user-${itm.id}'>${JH.sanitize(itm.metadata)}</td>`
      row += `<td class='border-end'><sl-copy-button title='Copy user to clipboard' from='user-${itm.id}'></sl-copy-button></td>`
      row += `<td id='password-${itm.id}'>****</td>`
      row += `<td><sl-copy-button id='passwordcopy-${itm.id}' title='Copy password to clipboard' data-id='${itm.id}' from='password-${itm.id}'></sl-copy-button></td>`
      row += `<td><sl-icon-button id='passwordshow-${itm.id}' title='Show/hide password' data-id='${itm.id}' name='eye'></sl-icon-button></td>`
      row += '</tr>'
    }
    domCache.itemsTableBody.innerHTML = row
  } else {
    domCache.itemsTableBody.innerHTML = '<tr><td colspan="99">No item found</td></tr>'
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
    domCache.folderRemoveButton.setAttribute('disabled', 'disabled')
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
    domCache.itemActivityTableBody.innerHTML += row
  } else {
    domCache.itemActivityTableBody.innerHTML += '<tr><td colspan="99">No other activity found</td></tr>'
    domCache.itemActivityLoadButton.setAttribute('disabled', 'disabled')
  }
}

async function folderClicked () {
  PW.setTableLoading(domCache.itemsTable)

  // Read folder info
  JH.value(domCache.searchTypeSelect, '')
  const resp = await JH.http(`/api/folders/${Folders.currentFolder()}`)

  // Folder may not be accessible
  if (!await PW.checkResponse(resp, 403)) {
    return
  }

  const body = await resp.json()
  if (body.data && body.data.permissions) {
    Folders.currentPermissions.read = body.data.permissions.read
    Folders.currentPermissions.write = body.data.permissions.write
    domCache.sectionTitle.innerHTML = `${body.data.description} - Items`
  } else {
    Folders.currentPermissions.read = false
    Folders.currentPermissions.write = false
    domCache.sectionTitle.innerHTML = 'Items'
  }

  let cp = ['danger', 'No access', 'No access']
  if (Folders.currentPermissions.read) {
    cp = ['warning', 'R', 'Read only']
  }
  if (Folders.currentPermissions.write) {
    cp = ['success', 'RW ', 'Read and write']
  }

  domCache.currentPermissions.setAttribute('variant', cp[0])
  domCache.currentPermissions.setAttribute('title', cp[2])
  domCache.currentPermissions.innerHTML = cp[1]

  // Load items
  if (Folders.currentPermissions.read) {
    await fillItems()
  } else {
    domCache.itemsTableBody.innerHTML = '<tr><td colspan="99">No item found</td></tr>'
  }

  if (Folders.currentPermissions.write) {
    domCache.newItemButton.removeAttribute('disabled')
    domCache.folderCreateButton.removeAttribute('disabled')
    domCache.folderRemoveButton.removeAttribute('disabled')
    domCache.folderEditButton.removeAttribute('disabled')
  } else {
    domCache.newItemButton.setAttribute('disabled', 'disabled')
    domCache.folderCreateButton.setAttribute('disabled', 'disabled')
    domCache.folderRemoveButton.setAttribute('disabled', 'disabled')
    domCache.folderEditButton.setAttribute('disabled', 'disabled')
  }
}

function itemCreateDialog () {
  domCache.itemCreateDialog.show()
  JH.value('#itemcreatedialog sl-input,sl-textarea,sl-select', '')

  domCache.newPassword.setAttribute('type', 'password')

  itemCreateEnable()
}

async function itemCreate () {
  domCache.itemCreateDialog.hide()

  const itemdata = {
    _csrf: PW.getCSRFToken(),
    type: JH.value(domCache.newType),
    title: JH.value(domCache.newTitle),
    email: JH.value(domCache.newEmail),
    description: JH.value(domCache.newDescription),
    url: JH.value(domCache.newUrl),
    user: JH.value(domCache.newUser),
    password: JH.value(domCache.newPassword)
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
  if (JH.value(domCache.newTitle) === '') {
    domCache.itemCreateSaveButton.setAttribute('disabled', 'disabled')
  } else {
    domCache.itemCreateSaveButton.removeAttribute('disabled')
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

  domCache.itemEditDialog.show()
  domCache.editPassword.setAttribute('type', 'password')

  itemEditFill(item)
  itemEditEnable()
}

async function itemEditFill (item) {
  const resp = await JH.http(`/api/items/${item}`)
  if (!await PW.checkResponse(resp)) {
    domCache.itemEditDialog.hide()
    return
  }

  JH.query(domCache.editPassword).passwordVisible = false

  const body = await resp.json()
  body.data.data = JSON.parse(body.data.data)
  if (body.status === 'success') {
    JH.value(domCache.editId, item)
    JH.value(domCache.editType, body.data.type)
    JH.value(domCache.editTitle, body.data.title)
    JH.value(domCache.editEmail, body.data.data.email)
    JH.value(domCache.editDescription, body.data.data.description)
    JH.value(domCache.editUrl, body.data.data.url)
    JH.value(domCache.editUser, body.data.data.user)
    JH.value(domCache.editPassword, body.data.data.password)
  }

  itemEditEnable()
}

function itemEditEnable () {
  if (JH.value(domCache.editTitle) === '') {
    domCache.editItemSaveButton.setAttribute('disabled', 'disabled')
  } else {
    domCache.editItemSaveButton.removeAttribute('disabled')
  }
}

async function itemEdit () {
  const id = JH.value(domCache.editId)

  const itemdata = {
    _csrf: PW.getCSRFToken(),
    title: JH.value(domCache.editTitle),
    type: JH.value(domCache.editType),
    data: {
      description: JH.value(domCache.editDescription),
      email: JH.value(domCache.editEmail),
      url: JH.value(domCache.editUrl),
      user: JH.value(domCache.editUser),
      password: JH.value(domCache.editPassword)
    }
  }

  domCache.itemEditDialog.hide()
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
    domCache.itemViewDialog.hide()
    return
  }

  const body = await resp.json()
  body.data.data = JSON.parse(body.data.data)

  JH.value(domCache.viewId, item)
  JH.value(domCache.viewTitle, body.data.title)
  JH.value(domCache.viewType, body.data.type)
  JH.value(domCache.viewEmail, body.data.data.email)
  JH.value(domCache.viewDescription, body.data.data.description)
  JH.value(domCache.viewUrl, body.data.data.url)
  JH.value(domCache.viewUser, body.data.data.user)
  JH.value(domCache.viewPassword, body.data.data.password)
  domCache.viewPassword.setAttribute('type', 'password')

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

  domCache.itemViewDialog.show()
  domCache.viewPassword.passwordVisible = false

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
  if (JH.value(domCache.scope) === '2' && JH.value(domCache.scopeUser) === '') {
    domCache.shareSaveButton.setAttribute('disabled', 'disabled')
    return
  }
  domCache.shareSaveButton.removeAttribute('disabled')
}

async function itemOneTimeShareDialog (itm) {
  domCache.scopeSelect.show()
  JH.value(domCache.scope, '1')
  JH.value(domCache.shareItemId, itm)
  showScopeUser()
  enableShareSave()
}

async function itemOneTimeShare () {
  const data = {
    _csrf: PW.getCSRFToken(),
    scope: JH.value(domCache.scope),
    userid: JH.value(domCache.scopeUser),
    itemid: JH.value(domCache.shareItemId)
  }
  const resp = await JH.http('/api/onetimeshare', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  navigator.clipboard.writeText(`${window.location.origin}/onetimesecret/${body.data.token}`)

  PW.showToast('primary', 'One time share link copied to clipboard')
  domCache.scopeSelect.hide()
}

function findAndShowItem (itm) {
  itemViewFill(itm, true)
  domCache.itemViewDialog.show()
}

function personalPasswordCreateDialog () {
  domCache.personalPasswordNewDialog.show()
}

function personalPasswordAskDialog () {
  domCache.personalPasswordSetDialog.show()
}

function personalPasswordCreateEnable () {
  if (JH.value(domCache.personalPasswordNew) === '' ||
      JH.value(domCache.personalPasswordNew).length < 8 ||
      JH.value(domCache.personalPasswordNew) !== JH.value(domCache.personalPasswordNewConfirm)) {
    domCache.personalPasswordNewButton.setAttribute('disabled', 'disabled')
  } else {
    domCache.personalPasswordNewButton.removeAttribute('disabled')
  }
}

async function personalPasswordCreate () {
  const data = {
    _csrf: PW.getCSRFToken(),
    password: JH.value(domCache.personalPasswordNew)
  }

  const resp = await JH.http('/api/personalpassword', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  domCache.personalPasswordNewDialog.hide()

  PW.showToast('success', 'Personal password saved')
  await fillItems()
}

async function personalPasswordSet () {
  const data = {
    _csrf: PW.getCSRFToken(),
    password: JH.value('#personalpasswordask')
  }

  domCache.personalPasswordSetDialog.hide()
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
  JH.query(`#password-${item}`).innerHTML = JH.sanitize(body.data.data.password)

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
  PW.setTreeviewLoading(domCache.foldersTree)

  const resp = await JH.http(`/api/users/${PW.getUser()}/folders`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (domCache.viewItem) {
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
    JH.value(domCache.newPassword, body.data.password)
  }
}

async function itemActivity (itm) {
  domCache.itemActivityTableBody.innerHTML = ''
  domCache.itemActivityDialog.show()
  domCache.itemActivityLoadButton.removeAttribute('disabled')

  JH.value(domCache.itemActivityId, itm)
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
JH.event(domCache.searchTypeSelect, 'sl-change', fillItems)

// Create
JH.event(domCache.newItemButton, 'click', itemCreateDialog)

JH.event(domCache.itemCreateCancelButton, 'click', (ev) => {
  JH.query('#itemcreatedialog').hide()
})
JH.event(domCache.itemCreateSaveButton, 'click', itemCreate)

JH.event(domCache.newTitle, 'keyup', itemCreateEnable)

// Edit
JH.event(domCache.editTitle, 'keyup', itemEditEnable)
JH.event(domCache.itemEditCancelButton, 'click', (ev) => {
  JH.query('#itemeditdialog').hide()
})
JH.event(domCache.itemEditSaveButton, 'click', itemEdit)

// Personal
JH.event(domCache.personalPasswordNewCancel, 'click', (ev) => {
  domCache.personalPasswordNewDialog.hide()
})
JH.event(domCache.personalPasswordSetCancel, 'click', (ev) => {
  domCache.personalPasswordSetDialog.hide()
})
JH.event(domCache.personalPasswordNewButton, 'click', personalPasswordCreate)

JH.event([domCache.personalPasswordNew, domCache.personalPasswordNewConfirm], 'keyup', personalPasswordCreateEnable)

JH.event(domCache.personalPasswordSetButton, 'click', personalPasswordSet)

JH.event(domCache.itemSearchText, 'sl-input', (ev) => {
  if (itemSearchTimeout) {
    clearTimeout(itemSearchTimeout)
  }
  itemSearchTimeout = setTimeout(async () => { fillItems() }, 250)
})

JH.event(domCache.viewCopyPassword, 'sl-copy', (ev) => {
  passwordCopied(JH.value(domCache.viewId))
})

JH.event(domCache.viewCopyLink, 'click', (ev) => {
  itemCopyLink(JH.value(domCache.viewId))
})

JH.event(domCache.editCopyLink, 'click', (ev) => {
  itemCopyLink(JH.value(domCache.editId))
})

JH.event(domCache.newGenerateButton, 'click', itemCreateGeneratePassword)

if (domCache.viewItem) {
  setTimeout(() => {
    findAndShowItem(JH.value(domCache.viewItem))
  }, 200)
}

addEventListener('folders-refresh', async (ev) => {
  await fillFolders()
})

addEventListener('pw-item-found', async (ev) => {
  folderClicked()
})

JH.event(domCache.itemActivityButton, 'click', (ev) => {
  itemActivity(JH.value(domCache.viewId))
})

JH.event(domCache.editViewActivity, 'click', (ev) => {
  itemActivity(JH.value(domCache.editId))
})

JH.event(domCache.itemActivityLoadButton, 'click', (ev) => {
  fillActivity(JH.value(domCache.itemActivityId))
})

await fillFolders()
await fillItemTypes()

domCache.viewPassword.shadowRoot.querySelector('[part=password-toggle-button]').addEventListener('click', (ev) => {
  const el = domCache.viewPassword.shadowRoot.querySelector('[part=input]')
  if (el.getAttribute('type') === 'text') {
    passwordAccessed(JH.value(domCache.viewId))
  }
})

domCache.editPassword.shadowRoot.querySelector('[part=password-toggle-button]').addEventListener('click', (ev) => {
  const el = domCache.editPassword.shadowRoot.querySelector('[part=input]')
  if (el.getAttribute('type') === 'text') {
    passwordAccessed(JH.value(domCache.editId))
  }
})

function showScopeUser () {
  if (JH.value(domCache.scope) === '2') {
    domCache.selectUser.style.visibility = 'visible'
  } else {
    domCache.selectUser.style.visibility = 'hidden'
    JH.value(domCache.scopeUser, '')
    JH.value(domCache.scopeUserDescription, '')
  }
}

JH.event(domCache.scope, 'sl-change', (ev) => {
  showScopeUser()
  enableShareSave()
})

JH.event(domCache.shareSaveButton, 'click', (ev) => {
  itemOneTimeShare()
})

function userChoosen (userid, userdesc) {
  JH.value(domCache.scopeUser, userid)
  JH.value(domCache.scopeUserDescription, userdesc)
  UPicker.hide()
  enableShareSave()
}

JH.event(domCache.userSearch, 'click', (ev) => {
  UPicker.show(userChoosen)
})
