/* global addEventListener */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'
import * as Folders from './folders_shared.js'
import * as Items from './items_shared.js'
import * as CPicker from './picker.js'
import * as Crypt from './crypt.js'

let itemSearchTimeout
let itemTypesOptions

const domCache = {
  searchFavorite: JH.query('#favorite'),
  sectionTitle: JH.query('#sectiontitle'),
  currentPermissions: JH.query('#currentpermissions'),
  itemSearchText: JH.query('#itemsearch'),
  searchTypeSelect: JH.query('#typesearch'),
  itemsTable: JH.query('#itemstable'),
  itemsTableBody: JH.query('#itemstable tbody'),
  newItemButton: JH.query('#newitem'),
  folderCreateButton: JH.query('#foldercreate'),
  folderEditButton: JH.query('#folderedit'),
  folderRemoveButton: JH.query('#folderremove'),
  itemCreateDialog: JH.query('#itemcreatedialog'),
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
  personalPasswordSetDialog: JH.query('#personalpasswordset'),
  personalPasswordSetButton: JH.query('#personalpasswordsetbutton'),
  personalPasswordSetAlert: JH.query('#personalpasswordsetalert'),
  personalPasswordAsk: JH.query('#personalpasswordask'),
  foldersTree: JH.query('#folderstree'),
  viewItem: JH.query('#viewitem'),
  userSearch: JH.query('#searchuser'),
  selectUser: JH.query('#selectuser'),
  itemDialog: JH.query('#itemdialog'),
  itemDialogCopyLink: JH.query('#idcopylink'),
  itemDialogActivity: JH.query('#idactivity'),
  itemDialogId: JH.query('#idid'),
  itemDialogTitle: JH.query('#idtitle'),
  itemDialogType: JH.query('#idtype'),
  itemDialogDescription: JH.query('#iddescription'),
  itemDialogEmail: JH.query('#idemail'),
  itemDialogUrl: JH.query('#idurl'),
  itemDialogUser: JH.query('#iduser'),
  itemDialogPassword: JH.query('#idpassword'),
  itemDialogGenerate: JH.query('#idgenerate'),
  itemDialogCopyPassword: JH.query('#idcopypassword'),
  itemDialogOpenUrl: JH.query('#idopenurl'),
  itemDialogSave: JH.query('#idsave'),
  itemDialogCancel: JH.query('#idcancel'),
  itemDropDialog: JH.query('#itemdropdialog'),
  itemDropFolderId: JH.query('#iddfolderid'),
  itemDropItemId: JH.query('#idditemid'),
  itemDropAction: JH.query('#iddaction'),
  itemDropCancel: JH.query('#iddcancel'),
  itemDropSave: JH.query('#iddconfirm')
}

async function fillItemTypes () {
  const resp = await JH.http('/api/itemtypes')
  if (!await PW.checkResponse(resp)) {
    return
  }

  itemTypesOptions = ''
  const body = await resp.json()
  for (const itm of body.data) {
    itemTypesOptions += `<wa-option id='itemtype-${itm.id}' value='${itm.id}'>${itm.description}`
    if (itm.icon) {
      itemTypesOptions += `<wa-icon name='${itm.icon}' slot='start'></wa-icon>`
    }
    itemTypesOptions += '</wa-option>'
  }

  domCache.itemDialogType.innerHTML = itemTypesOptions
  domCache.searchTypeSelect.innerHTML = itemTypesOptions
}

async function fillItems () {
  const search = JH.value(domCache.itemSearchText)
  const type = JH.value(domCache.searchTypeSelect)
  const fav = JH.query(domCache.searchFavorite).checked ? 'true' : ''

  PW.setTableLoading(domCache.itemsTable)

  const resp = await JH.http(`/api/itemslist/${Folders.currentFolder()}?search=${search}&type=${type}&favorite=${fav}`)

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
      row += `<tr id='row-${itm.id}' data-id='${itm.id}' draggable='true'>`
      row += '<td class="border-end">'
      row += `<wa-dropdown id="menu-${itm.id}" data-id='${itm.id}' data-linkeditemid='${itm.linkeditemid || ''}'><wa-button label="Menu" size="small" pill appearance="plain" slot="trigger"><wa-icon name="ellipsis-vertical" label="Menu"></wa-icon></wa-button>`
      row += '</wa-dropdown>'
      row += `<wa-button size="small" id='fav-${itm.id}' data-id='${itm.id}' data-fav='${itm.favorite}' title="Favorite" appearance="plain"><wa-icon name='star' style="color:${itm.favorite ? 'gold' : 'gainsboro'};" label='Favorite'></wa-icon></wa-button>`
      row += `<wa-button size="small" id='link-${itm.id}' title='Copy item link' appearance="plain" data-id='${itm.id}'><wa-icon label="Copy item link" name='link'></wa-icon></wa-button>`
      if (itm.linkeditemid) {
        row += `<wa-button size="small" title='Linked item' appearance="plain" data-id='${itm.id}'><wa-icon label="Linked item" style="color: green;" name='right-to-bracket'></wa-icon></wa-button>`
      }
      row += '</td>'
      row += '<td class="border-end">'
      if (itm.type) {
        row += `<wa-badge appearance='outlined' variant='neutral'><wa-icon name='${itm.itemtype.icon}'></wa-icon>${JH.sanitize(itm.itemtype.description)}</wa-badge>`
      }
      row += '<td class="border-start border-end itemtitle">'
      row += `<a id='title-${itm.id}' data-id='${itm.id}' >${JH.sanitize(itm.title)}</a>`
      row += '</td>'
      row += `<td class='border-end' id='user-${itm.id}'><wa-copy-button title='Copy user to clipboard' from='user-${itm.id}'></wa-copy-button>${JH.sanitize(itm.metadata)}</td>`
      row += '<td>'
      row += `<wa-copy-button id='passwordcopy-${itm.id}' title='Copy password to clipboard' data-id='${itm.id}' from='password-${itm.id}'></wa-copy-button>`
      row += `<wa-button size="small" appearance="plain"><wa-icon id='passwordshow-${itm.id}' title='Show/hide password' label='Show/hide password' data-id='${itm.id}' name='eye'></wa-icon></wa-button>`
      row += `<span style='margin-left:5px; margin-right:5px;' id='password-${itm.id}'>****</span>`
      row += '</td>'
      row += '</tr>'
    }
    domCache.itemsTableBody.innerHTML = row
  } else {
    domCache.itemsTableBody.innerHTML = '<tr><td colspan="99">No item found</td></tr>'
  }

  // Install event handlers
  JH.event('#itemstable tbody [id^=fav]', 'click', async (ev) => {
    await Items.setFavorite(ev.currentTarget.getAttribute('data-id'), ev.currentTarget.getAttribute('data-fav') === 'false')
    await fillItems()
  })
  JH.event('#itemstable tbody [id^=menu]', 'click', (ev) => {
    itemDropDown(ev.currentTarget.getAttribute('data-id'), ev.currentTarget.getAttribute('data-linkeditemid'))
  })
  JH.event('#itemstable tbody [id^=title]', 'click', (ev) => {
    itemShow(ev.currentTarget.getAttribute('data-id'), true)
  })
  JH.event('#itemstable tbody [id^=link]', 'click', (ev) => {
    Items.itemCopyLink(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#itemstable tbody [id^=passwordcopy]', 'click', (ev) => {
    passwordCopy(ev)
  })
  JH.event('#itemstable tbody [id^=passwordshow]', 'click', (ev) => {
    passwordShow(ev)
  })

  // Setup drag'n'drop
  JH.draggable("#itemstable [id^='row-']", 'item')
}

function itemDropDown (id, linkeditemid) {
  if (!JH.query(`#menu-${id}`).open) {
    return
  }
  if (JH.query(`#menu-${id} wa-dropdown-item`) !== null) {
    return
  }

  let row = ''
  if (Folders.currentPermissions.write) {
    if (!linkeditemid) {
      row += `<wa-dropdown-item id='edit-${id}' title='Edit item' data-id='${id}'><wa-icon label="Edit item" name='edit' slot='icon'></wa-icon>Edit</wa-dropdown-item>`
    } else {
      row += `<wa-dropdown-item disabled="disabled"title='Edit item' data-id='${id}'><wa-icon label="Edit item" name='edit' slot='icon'></wa-icon>Edit</wa-dropdown-item>`
    }
    row += `<wa-dropdown-item id='clone-${id}' title='Clone item' data-id='${id}'><wa-icon label="Clone" name='clone' slot='icon'></wa-icon>Clone</wa-dropdown-item>`
  }
  if (!Folders.currentPermissions.personal) {
    row += `<wa-dropdown-item id='onetime-${id}' title='One time share' data-id='${id}'><wa-icon label="One time share" name='1' slot='icon'></wa-icon>One time share</wa-dropdown-item>`
  }
  row += `<wa-dropdown-item id='activity-${id}' title='Activity' data-id='${id}'><wa-icon label="Activity" name='clock' slot='icon'></wa-icon>Activity</wa-dropdown-item>`

  if (Folders.currentPermissions.write) {
    row += `<wa-dropdown-item id='remove-${id}' title='Delete item' data-id='${id}'><wa-icon label="Delete" name='trash' slot='icon' style="color:red;"></wa-icon>Delete</wa-dropdown-item>`
  }

  JH.query(`#menu-${id}`).insertAdjacentHTML('beforeend', row)

  JH.event(`#edit-${id}`, 'click', (ev) => {
    itemShow(id, false)
  })
  JH.event(`#clone-${id}`, 'click', (ev) => {
    itemClone(id)
  })
  JH.event(`#activity-${id}`, 'click', (ev) => {
    Items.itemActivityShow(id)
  })
  JH.event(`#onetime-${id}`, 'click', (ev) => {
    itemOneTimeShareDialog(id)
  })
  JH.event(`#remove-${id}`, 'click', (ev) => {
    itemRemove(id)
  })
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
  Folders.currentPermissions.personal = body.data.personal

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
    JH.enable(domCache.newItemButton)
    JH.enable(domCache.folderCreateButton)
    JH.enable(domCache.folderRemoveButton)
    JH.enable(domCache.folderEditButton)
  } else {
    JH.disable(domCache.newItemButton)
    JH.disable(domCache.folderCreateButton)
    JH.disable(domCache.folderRemoveButton)
    JH.disable(domCache.folderEditButton)
  }

  // Folder cannot be removed if not empty
  if (JH.query("#itemstable [id^='row-']")) {
    JH.disable(domCache.folderRemoveButton)
  }
}

function itemDialogEnable (enable) {
  if (enable) {
    JH.removeAttribute('#itemdialog wa-input,wa-textarea', 'readonly')
    JH.removeAttribute(domCache.itemDialogType, 'disabled')
    JH.show([domCache.itemDialogSave, domCache.itemDialogGenerate])
  } else {
    JH.attribute('#itemdialog wa-input,wa-textarea,wa-select', 'readonly', 'readonly')
    JH.attribute(domCache.itemDialogType, 'disabled', true)
    JH.hide([domCache.itemDialogSave, domCache.itemDialogGenerate])
  }
}

async function itemDialogShow (id, readonly, gotofolder) {
  itemDialogReset()

  domCache.itemDialogPassword.setAttribute('type', 'password')

  if (id?.length) {
    JH.value(domCache.itemDialogId, id)
    itemDialogFill(id, gotofolder)
    JH.show(domCache.itemDialogCopyLink)
    JH.show(domCache.itemDialogActivity)
  } else {
    JH.hide(domCache.itemDialogCopyLink)
    JH.hide(domCache.itemDialogActivity)
  }

  itemDialogEnable(!readonly)
  itemSaveEnable()

  domCache.itemDialog.show()
}

function itemDialogHide () {
  domCache.itemDialog.open = false
}

function itemDialogReset () {
  JH.value('#itemdialog wa-input,wa-textarea,wa-select', '')
}

function itemSaveEnable () {
  if (JH.value(domCache.itemDialogTitle) === '') {
    JH.disable(domCache.itemDialogSave)
  } else {
    JH.enable(domCache.itemDialogSave)
  }
}

async function itemSave () {
  const id = JH.value(domCache.itemDialogId)

  itemDialogHide()

  const itemdata = {
    _csrf: PW.getCSRFToken(),
    title: JH.value(domCache.itemDialogTitle),
    type: JH.value(domCache.itemDialogType),
    data: {
      description: JH.value(domCache.itemDialogDescription),
      email: JH.value(domCache.itemDialogEmail),
      url: JH.value(domCache.itemDialogUrl),
      user: JH.value(domCache.itemDialogUser),
      password: JH.value(domCache.itemDialogPassword)
    }
  }

  let resp
  if (id.length) {
    resp = await JH.http(`/api/itemupdate/${id}`, itemdata)
  } else {
    resp = await JH.http(`/api/itemnew/${Folders.currentFolder()}`, itemdata)
  }

  if (!await PW.checkResponse(resp)) {
    return
  }

  await fillItems()
  PW.showToast('success', id ? 'Item updated' : 'Item created')
}

async function itemRemove (itm) {
  PW.confirmDialog('Delete item', 'Are you sure you want to delete this item? If linked items exist, they will also be deleted.', async () => {
    const resp = await JH.http(`/api/itemremove/${itm}`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    await fillItems()
    PW.showToast('success', 'Item deleted')
  }, 'Delete', 'danger')
}

async function itemDialogFill (item, gotofolder) {
  const key = Crypt.createKey()

  const resp = await JH.http(`/api/items/${item}?key=${encodeURIComponent(key)}`)
  if (!await PW.checkResponse(resp)) {
    itemDialogHide()
    return
  }

  domCache.itemDialogPassword.passwordVisible = false

  const body = await resp.json()

  // Decrypt data using token
  const decrypted = JSON.parse(await Crypt.decryptBlock(body.data.data, key))

  if (body.status === 'success') {
    JH.value(domCache.itemDialogId, item)
    JH.value(domCache.itemDialogType, body.data.type)
    JH.value(domCache.itemDialogTitle, body.data.title)
    JH.value(domCache.itemDialogEmail, decrypted.email)
    JH.value(domCache.itemDialogDescription, decrypted.description)
    JH.value(domCache.itemDialogUrl, decrypted.url)
    JH.value(domCache.itemDialogUser, decrypted.user)
    JH.value(domCache.itemDialogPassword, decrypted.password)
  }

  if (gotofolder) {
    PW.treeItemSelect(`item-${body.data.folderid}`)
    await folderClicked()
  }

  itemSaveEnable()
}

function itemShow (item, readonly) {
  if (window.getSelection()) {
    window.getSelection().empty()
  }

  itemDialogShow(item, readonly)
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
    itemDialogShow(body.data.id, false)
  })
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

async function itemLink (itemid, folderid) {
  const itemdata = {
    _csrf: PW.getCSRFToken(),
    folderid,
    itemid
  }

  const resp = await JH.http('/api/linkeditems', itemdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Item linked')
  await fillItems()
}

function enableShareSave () {
  if (JH.value(domCache.scope) === '2' && JH.value(domCache.scopeUser) === '') {
    JH.disable(domCache.shareSaveButton)
    return
  }
  JH.enable(domCache.shareSaveButton)
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
  navigator.clipboard.writeText(body.data.link)

  PW.showToast('primary', 'One time share link copied to clipboard')
  domCache.scopeSelect.open = false
}

function findAndShowItem (itm) {
  itemDialogShow(itm, true, true)
}

function personalPasswordCreateDialog () {
  domCache.personalPasswordNewDialog.show()
}

function personalPasswordAskDialog () {
  JH.hide(domCache.personalPasswordSetAlert)
  domCache.personalPasswordAsk.value = ''
  domCache.personalPasswordSetDialog.show()
}

function personalPasswordCreateEnable () {
  if (JH.value(domCache.personalPasswordNew) === '' ||
      JH.value(domCache.personalPasswordNew).length < 8 ||
      JH.value(domCache.personalPasswordNew) !== JH.value(domCache.personalPasswordNewConfirm)) {
    JH.disable(domCache.personalPasswordNewButton)
  } else {
    JH.enable(domCache.personalPasswordNewButton)
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

  domCache.personalPasswordNewDialog.open = false

  PW.showToast('success', 'Personal password saved')
  await fillItems()
}

async function personalPasswordSet () {
  const data = {
    _csrf: PW.getCSRFToken(),
    password: JH.value(domCache.personalPasswordAsk)
  }

  const resp = await JH.http('/api/personalunlock', data)
  if (!await PW.checkResponse(resp, null, false)) {
    JH.show(domCache.personalPasswordSetAlert)
    domCache.personalPasswordAsk.focus()
    return
  }

  PW.showToast('success', 'Personal folder unlocked')
  domCache.personalPasswordSetDialog.open = false
  await fillFolders()
  await folderClicked()
}

async function passwordCopy (ev) {
  const key = Crypt.createKey()
  const item = ev.currentTarget.getAttribute('data-id')

  const resp = await JH.http(`/api/items/${item}?key=${encodeURIComponent(key)}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()

  // Decrypt data using token
  const decrypted = JSON.parse(await Crypt.decryptBlock(body.data.data, key))

  navigator.clipboard.writeText(decrypted.password)

  passwordCopied(item)
}

async function passwordShow (ev) {
  const key = Crypt.createKey()
  const item = ev.currentTarget.getAttribute('data-id')

  if (JH.query(`#password-${item}`).innerHTML !== '****') {
    JH.query(`#password-${item}`).innerHTML = '****'
    return
  }

  const resp = await JH.http(`/api/items/${item}?key=${encodeURIComponent(key)}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()

  // Decrypt data using token
  const decrypted = JSON.parse(await Crypt.decryptBlock(body.data.data, key))

  JH.query(`#password-${item}`).innerHTML = JH.sanitize(decrypted.password)

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

async function itemDialogGeneratePassword () {
  const resp = await JH.http('/api/generatepassword')
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    JH.value(domCache.itemDialogPassword, body.data.password)
  }
}

async function itemDropped (itemid, folderid) {
  domCache.itemDropFolderId.value = folderid
  domCache.itemDropItemId.value = itemid
  domCache.itemDropAction.value = 'move'
  domCache.itemDropDialog.open = true
}

async function itemDroppedDo () {
  const action = domCache.itemDropAction.value
  const itemid = domCache.itemDropItemId.value
  const folderid = domCache.itemDropFolderId.value

  if (action === 'move') {
    await itemMove(itemid, folderid)
  } else if (action === 'link') {
    await itemLink(itemid, folderid)
  }

  domCache.itemDropDialog.open = false
}

JH.event(domCache.itemDialogActivity, 'click', (ev) => {
  Items.itemActivityShow(JH.value(domCache.itemDialogId))
})

// Drag'n'drop
async function dndSetup () {
  JH.draggable('wa-tree-item', 'folder')
  JH.dropTarget('wa-tree-item', async (ev, data) => {
    const newparent = ev.target.getAttribute('data-id')

    if (data.type === 'folder') {
      const folder = data.data
      await Folders.folderMove(folder, newparent)
    }
    if (data.type === 'item') {
      const item = data.data
      itemDropped(item, newparent)
    }
  })
}

// Search
JH.event(domCache.searchTypeSelect, 'change', fillItems)

// Create
JH.event(domCache.newItemButton, 'click', (ev) => {
  itemDialogShow(undefined, false, false)
})

JH.event(domCache.itemDialogSave, 'click', itemSave)

JH.event(domCache.itemDialogTitle, 'keyup', itemSaveEnable)

// Personal
JH.event(domCache.personalPasswordNewButton, 'click', personalPasswordCreate)

JH.event([domCache.personalPasswordNew, domCache.personalPasswordNewConfirm], 'keyup', personalPasswordCreateEnable)

JH.event(domCache.personalPasswordSetButton, 'click', personalPasswordSet)
JH.event(domCache.personalPasswordAsk, 'keydown', (ev) => {
  if (ev.key === 'Enter') {
    personalPasswordSet()
  }
})

JH.event(domCache.itemSearchText, 'input', (ev) => {
  if (itemSearchTimeout) {
    clearTimeout(itemSearchTimeout)
  }
  itemSearchTimeout = setTimeout(async () => { fillItems() }, 250)
})

JH.event(domCache.itemDialogCopyPassword, 'wa-copy', (ev) => {
  passwordCopied(JH.value(domCache.itemDialogId))
})

JH.event(domCache.itemDialogCopyLink, 'click', (ev) => {
  Items.itemCopyLink(JH.value(domCache.itemDialogId))
})

JH.event(domCache.itemDialogGenerate, 'click', itemDialogGeneratePassword)

JH.event(domCache.searchFavorite, 'change', fillItems)

if (domCache.viewItem) {
  setTimeout(() => {
    findAndShowItem(JH.value(domCache.viewItem))
  }, 200)
}

addEventListener('folders-refresh', async (ev) => {
  await fillFolders()
})

addEventListener('pw-item-found', async (ev) => {
  await folderClicked()
})

JH.event(domCache.itemDropCancel, 'click', (ev) => {
  domCache.itemDropDialog.hide()
})

JH.event(domCache.itemDropSave, 'click', itemDroppedDo)

await fillFolders()
await fillItemTypes()

domCache.itemDialogPassword.shadowRoot.querySelector('[part=password-toggle-button]').addEventListener('click', (ev) => {
  const el = domCache.itemDialogPassword.shadowRoot.querySelector('[part=input]')
  if (el.getAttribute('type') === 'text') {
    passwordAccessed(JH.value(domCache.itemDialogId))
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

JH.event(domCache.scope, 'change', (ev) => {
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
  UPicker.show()
})

JH.event(domCache.itemDialogOpenUrl, 'click', (ev) => {
  const url = JH.value(domCache.itemDialogUrl).trim()
  if (url.length && (url.startsWith('http://') || url.startsWith('https://'))) {
    window.open(url, '_blank', 'noopener')
  } else {
    PW.showToast('danger', 'Invalid URL')
  }
})
// Picker
const UPicker = new CPicker.Picker('users', userChoosen)
