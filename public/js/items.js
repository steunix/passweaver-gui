/* global jhEvent, jhQuery, jhValue, jhFetch, jhDraggable, jhDropTarget, addEventListener */

import * as PW from './passweaver-gui.js'
import * as Folders from './folders_shared.js'

let itemSearchTimeout
let itemTypesOptions

async function fillItemTypes () {
  const resp = await jhFetch('/api/itemtypes')
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

  jhQuery('#viewtype').innerHTML = itemTypesOptions
  jhQuery('#edittype').innerHTML = itemTypesOptions
  jhQuery('#newtype').innerHTML = itemTypesOptions
  jhQuery('#typesearch').innerHTML = itemTypesOptions
}

async function fillItems () {
  const search = jhValue('#itemsearch')
  const type = jhValue('#typesearch')

  jhQuery('#itemstable tbody').innerHTML =
  `<tr>
    <td><sl-skeleton style='width:5rem;height:1rem;display:flex;'></sl-skeleton></td>
    <td></td>
    <td><sl-skeleton style='width:5rem;height:1rem;display:flex;'></sl-skeleton></td>
    <td><sl-skeleton style='width:5rem;height:1rem;display:flex;'></sl-skeleton></td>
    <td></td>
    <td><sl-skeleton style='width:5rem;height:1rem;display:flex;'></sl-skeleton></td>
    </tr>`
  const resp = await jhFetch(`/api/itemslist/${Folders.currentFolder()}?search=${search}&type=${type}`)

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
    jhQuery('#itemstable tbody').innerHTML = row
  } else {
    jhQuery('#itemstable tbody').innerHTML = '<tr><td colspan="99">No item found</td></tr>'
  }

  // Install event handlers
  jhEvent('#itemstable tbody [id^=view]', 'click', (ev) => {
    itemShow(ev.currentTarget.getAttribute('data-id'))
  })
  jhEvent('#itemstable tbody [id^=edit]', 'click', (ev) => {
    itemEditDialog(ev.currentTarget.getAttribute('data-id'))
  })
  jhEvent('#itemstable tbody [id^=title]', 'dblclick', (ev) => {
    itemShow(ev.currentTarget.getAttribute('data-id'))
  })
  jhEvent('#itemstable tbody [id^=remove]', 'click', (ev) => {
    itemRemove(ev.currentTarget.getAttribute('data-id'))
  })
  jhEvent('#itemstable tbody [id^=clone]', 'click', (ev) => {
    itemClone(ev.currentTarget.getAttribute('data-id'))
  })
  jhEvent('#itemstable tbody [id^=link]', 'click', (ev) => {
    itemCopyLink(ev.currentTarget.getAttribute('data-id'))
  })
  jhEvent('#itemstable tbody [id^=activity]', 'click', (ev) => {
    itemActivity(ev.currentTarget.getAttribute('data-id'))
  })
  jhEvent('#itemstable tbody [id^=passwordcopy]', 'click', (ev) => {
    passwordCopy(ev)
  })
  jhEvent('#itemstable tbody [id^=passwordshow]', 'click', (ev) => {
    passwordShow(ev)
  })

  // Folder cannot be removed if not empty
  if (jhQuery("#itemstable [id^='row-']")) {
    jhQuery('#folderremove').setAttribute('disabled', 'disabled')
  }

  // Setup drag'n'drop
  jhDraggable("#itemstable [id^='row-']", 'item')
}

async function fillActivity (itm) {
  // If a table is already populated, get last id and get next page
  let lastid = ''
  const lastrow = jhQuery('#itemactivitytable tbody tr:last-child td[id^=event]')
  if (lastrow) {
    lastid = lastrow.getAttribute('data-id')
  }

  const resp = await jhFetch(`/api/items/${itm}/activity?lastid=${lastid}`)

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
      row += `<td>${evt.user_description}</td>`
      row += `<td>${evt.action_description}</td>`
    }
    jhQuery('#itemactivitytable tbody').innerHTML += row
  } else {
    jhQuery('#itemactivitytable tbody').innerHTML += '<tr><td colspan="99">No other activity found</td></tr>'
    jhQuery('#itemactivityload').setAttribute('disabled', 'disabled')
  }
}

async function folderClicked (folderid) {
  jhQuery('#itemstable tbody').innerHTML = ''

  // Read folder info
  jhValue('#typesearch', '')
  const resp = await jhFetch(`/api/folders/${Folders.currentFolder()}`)

  // Folder may not be accessible
  if (!await PW.checkResponse(resp, 403)) {
    return
  }

  const body = await resp.json()
  if (body.data && body.data.permissions) {
    Folders.currentPermissions.read = body.data.permissions.read
    Folders.currentPermissions.write = body.data.permissions.write
    jhQuery('#sectiontitle').innerHTML = `${body.data.description} - Items`
  } else {
    Folders.currentPermissions.read = false
    Folders.currentPermissions.write = false
    jhQuery('#sectiontitle').innerHTML = 'Items'
  }

  let cp = ['danger', 'No access', 'No access']
  if (Folders.currentPermissions.read) {
    cp = ['warning', 'R', 'Read only']
  }
  if (Folders.currentPermissions.write) {
    cp = ['success', 'RW ', 'Read and write']
  }
  jhQuery('#currentpermissions').setAttribute('variant', cp[0])
  jhQuery('#currentpermissions').setAttribute('title', cp[2])
  jhQuery('#currentpermissions').innerHTML = cp[1]

  // Load items
  if (Folders.currentPermissions.read) {
    await fillItems()
  }

  if (Folders.currentPermissions.write) {
    jhQuery('#newitem').removeAttribute('disabled')
    jhQuery('#foldercreate').removeAttribute('disabled')
    jhQuery('#folderremove').removeAttribute('disabled')
    jhQuery('#folderedit').removeAttribute('disabled')
  } else {
    jhQuery('#newitem').setAttribute('disabled', 'disabled')
    jhQuery('#foldercreate').setAttribute('disabled', 'disabled')
    jhQuery('#folderremove').setAttribute('disabled', 'disabled')
    jhQuery('#folderedit').setAttribute('disabled', 'disabled')
  }
}

function itemCreateDialog () {
  jhQuery('#itemcreatedialog').show()
  jhValue('#itemcreatedialog sl-input,sl-textarea,sl-select', '')

  jhQuery('#newpassword').passwordVisible = false

  itemCreateEnable()
}

async function itemCreate () {
  jhQuery('#itemcreatedialog').hide()

  const itemdata = {
    _csrf: PW.getCSRFToken(),
    type: jhValue('#newtype'),
    title: jhValue('#newtitle'),
    email: jhValue('#newemail'),
    description: jhValue('#newdescription'),
    url: jhValue('#newurl'),
    user: jhValue('#newuser'),
    password: jhValue('#newpassword')
  }

  const resp = await jhFetch(`/api/itemnew/${Folders.currentFolder()}`, itemdata)
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
  if (jhValue('#newtitle') === '') {
    jhQuery('#itemcreatesave').setAttribute('disabled', 'disabled')
  } else {
    jhQuery('#itemcreatesave').removeAttribute('disabled')
  }
}

async function itemRemove (itm) {
  PW.confirmDialog('Delete item', 'Are you sure you want to delete this item?', async () => {
    const resp = await jhFetch(`/api/itemremove/${itm}`, { _csrf: PW.getCSRFToken() })
    if (!await PW.checkResponse(resp)) {
      return
    }

    await fillItems()
    PW.showToast('success', 'Item deleted')
  }, 'Delete', 'danger')
}

async function itemEditDialog (item) {
  jhValue('#itemeditdialog sl-input,sl-textarea,sl-select', '')
  jhQuery('#itemeditdialog').show()
  jhQuery('#editpassword').setAttribute('type', 'password')

  itemEditFill(item)
  itemEditEnable()
}

async function itemEditFill (item) {
  const resp = await jhFetch(`/api/items/${item}`)
  if (!await PW.checkResponse(resp)) {
    jhQuery('#itemeditdialog').hide()
    return
  }

  jhQuery('#editpassword').passwordVisible = false

  const body = await resp.json()
  if (body.status === 'success') {
    jhValue('#itemeditid', item)
    jhValue('#edittype', body.data.type)
    jhValue('#edittitle', body.data.title)
    jhValue('#editemail', body.data.data.email)
    jhValue('#editdescription', body.data.data.description)
    jhValue('#editurl', body.data.data.url)
    jhValue('#edituser', body.data.data.user)
    jhValue('#editpassword', body.data.data.password)
  }

  itemEditEnable()
}

function itemEditEnable () {
  if (jhValue('#edittitle') === '') {
    jhQuery('#itemeditsave').setAttribute('disabled', 'disabled')
  } else {
    jhQuery('#itemeditsave').removeAttribute('disabled')
  }
}

async function itemEdit () {
  const id = jhValue('#itemeditid')

  const itemdata = {
    _csrf: PW.getCSRFToken(),
    title: jhValue('#edittitle'),
    type: jhValue('#edittype'),
    data: {
      description: jhValue('#editdescription'),
      email: jhValue('#editemail'),
      url: jhValue('#editurl'),
      user: jhValue('#edituser'),
      password: jhValue('#editpassword')
    }
  }

  jhQuery('#itemeditdialog').hide()
  const resp = await jhFetch(`/api/itemupdate/${id}`, itemdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Item saved')
  await fillItems()
}

async function itemViewFill (item, gotofolder) {
  const resp = await jhFetch(`/api/items/${item}`)
  if (!await PW.checkResponse(resp)) {
    jhQuery('#itemviewdialog').hide()
    return
  }

  const body = await resp.json()
  jhValue('#itemviewid', item)
  jhValue('#viewtitle', body.data.title)
  jhValue('#viewtype', body.data.type)
  jhValue('#viewemail', body.data.data.email)
  jhValue('#viewdescription', body.data.data.description)
  jhValue('#viewurl', body.data.data.url)
  jhValue('#viewuser', body.data.data.user)
  jhValue('#viewpassword', body.data.data.password)
  jhQuery('#viewpassword').setAttribute('type', 'password')

  if (gotofolder) {
    PW.treeItemSelect(`item-${body.data.folderid}`)
    await fillItems()
  }
}

function itemShow (item) {
  if (window.getSelection()) {
    window.getSelection().empty()
  }
  jhValue('#itemviewdialog sl-input,sl-textarea,sl-select', '')
  jhQuery('#itemviewdialog').show()

  jhQuery('#viewpassword').passwordVisible = false

  itemViewFill(item)
}

async function itemClone (itm) {
  PW.confirmDialog('Clone item', 'Do you want to clone this item?', async () => {
    const resp = await jhFetch(`/api/items/${itm}/clone`, { _csrf: PW.getCSRFToken() })
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

  const resp = await jhFetch(`/api/itemmove/${id}`, itemdata)
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Item moved')
  await fillItems()
}

function findAndShowItem (itm) {
  itemViewFill(itm, true)
  jhQuery('#itemviewdialog').show()
}

function personalPasswordCreateDialog () {
  jhQuery('#personalpasswordnew').show()
}

function personalPasswordAskDialog () {
  jhQuery('#personalpasswordset').show()
}

function personalPasswordCreateEnable () {
  if (jhValue('#newpersonalpassword') === '' || jhValue('#newpersonalpassword').length < 8 || jhValue('#newpersonalpassword') !== jhValue('#newpersonalpasswordconfirm')) {
    jhQuery('#personalpasswordcreate').setAttribute('disabled', 'disabled')
  } else {
    jhQuery('#personalpasswordcreate').removeAttribute('disabled')
  }
}

async function personalPasswordCreate () {
  const data = {
    _csrf: PW.getCSRFToken(),
    password: jhValue('#newpersonalpassword')
  }

  const resp = await jhFetch('/api/personalpassword', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  jhQuery('#personalpasswordnew').hide()

  PW.showToast('success', 'Personal password saved')
  await fillItems()
}

async function personalPasswordSet () {
  const data = {
    _csrf: PW.getCSRFToken(),
    password: jhValue('#personalpasswordask')
  }

  jhQuery('#personalpasswordset').hide()
  const resp = await jhFetch('/api/personalunlock', data)
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

  const resp = await jhFetch(`/api/items/${item}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  navigator.clipboard.writeText(body.data.data.password)

  passwordCopied(item)
}

async function passwordShow (ev) {
  const item = ev.currentTarget.getAttribute('data-id')

  if (jhQuery(`#password-${item}`).innerHTML !== '****') {
    jhQuery(`#password-${item}`).innerHTML = '****'
    return
  }

  const resp = await jhFetch(`/api/items/${item}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  jhQuery(`#password-${item}`).innerHTML = body.data.data.password

  passwordAccessed(item)
}

async function passwordAccessed (item) {
  await jhFetch('/api/events', {
    _csrf: PW.getCSRFToken(),
    event: 80,
    entity: 30,
    entityid: item
  })
}

async function passwordCopied (item) {
  await jhFetch('/api/events', {
    _csrf: PW.getCSRFToken(),
    event: 81,
    entity: 30,
    entityid: item
  })
}

async function fillFolders () {
  const resp = await jhFetch('/api/folderstree')
  if (!await PW.checkResponse(resp)) {
    return
  }

  jhQuery('sl-tree').innerHTML = ''
  const body = await resp.json()
  PW.treeFill('folderstree', body.data, null, folderClicked)
  await dndSetup()
}

async function itemCreateGeneratePassword () {
  const resp = await jhFetch('/api/generatepassword')
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    jhValue('#newpassword', body.data.password)
  }
}

async function itemActivity (itm) {
  jhQuery('#itemactivitytable tbody').innerHTML = ''
  jhQuery('#itemactivitydialog').show()
  jhValue('#itemactivityid', itm)
  jhQuery('#itemactivityload').removeAttribute('disabled')
  fillActivity(itm)
}

await fillFolders()
await fillItemTypes()

// Drag'n'drop
async function dndSetup () {
  jhDraggable('sl-tree-item', 'folder')
  jhDropTarget('sl-tree-item', async (ev, data) => {
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
jhEvent('#typesearch', 'sl-change', () => {
  fillItems()
})

// Create
jhEvent('#newitem', 'click', (ev) => {
  itemCreateDialog()
})
jhEvent('#itemcreatecancel', 'click', (ev) => {
  jhQuery('#itemcreatedialog').hide()
})
jhEvent('#itemcreatesave', 'click', (ev) => {
  itemCreate()
})

// View
jhEvent('#newtitle', 'keyup', (ev) => {
  itemCreateEnable()
})

// Edit
jhEvent('#edittitle', 'keyup', (ev) => {
  itemEditEnable()
})
jhEvent('#itemeditcancel', 'click', (ev) => {
  jhQuery('#itemeditdialog').hide()
})
jhEvent('#itemeditsave', 'click', (ev) => {
  itemEdit()
})

// Personal
jhEvent('#personalpasswordcancel', 'click', (ev) => {
  jhQuery('#personalpasswordnew').hide()
})
jhEvent('#personalpasswordsetcancel', 'click', (ev) => {
  jhQuery('#personalpasswordset').hide()
})
jhEvent('#personalpasswordcreate', 'click', (ev) => {
  personalPasswordCreate()
})
jhEvent('#newpersonalpassword,#newpersonalpasswordconfirm', 'keyup', (ev) => {
  personalPasswordCreateEnable()
})

jhEvent('#personalpasswordsetbutton', 'click', (ev) => {
  personalPasswordSet()
})

jhEvent('#itemsearch', 'sl-input', (ev) => {
  if (itemSearchTimeout) {
    clearTimeout(itemSearchTimeout)
  }
  itemSearchTimeout = setTimeout(async () => { fillItems() }, 250)
})

jhEvent('#itemviewcopypassword', 'sl-copy', (ev) => {
  passwordCopied(jhValue('#itemviewid'))
})

jhEvent('#itemviewcopylink', 'click', (ev) => {
  itemCopyLink(jhValue('#itemviewid'))
})

jhEvent('#itemeditcopylink', 'click', (ev) => {
  itemCopyLink(jhValue('#itemeditid'))
})

jhEvent('#newgenerate', 'click', (ev) => {
  itemCreateGeneratePassword()
})

if (jhQuery('#viewitem')) {
  setTimeout(() => { findAndShowItem(jhValue('#viewitem')) }, 200)
}

jhQuery('#viewpassword').shadowRoot.querySelector('[part=password-toggle-button]').addEventListener('click', (ev) => {
  const el = jhQuery('#viewpassword').shadowRoot.querySelector('[part=input]')
  if (el.getAttribute('type') === 'text') {
    passwordAccessed(jhValue('#itemviewid'))
  }
})

jhQuery('#editpassword').shadowRoot.querySelector('[part=password-toggle-button]').addEventListener('click', (ev) => {
  const el = jhQuery('#editpassword').shadowRoot.querySelector('[part=input]')
  if (el.getAttribute('type') === 'text') {
    passwordAccessed(jhValue('#itemeditid'))
  }
})

addEventListener('folders-refresh', async (ev) => {
  await fillFolders()
})

addEventListener('pw-item-found', async (ev) => {
  folderClicked()
})

jhEvent('#itemviewactivity', 'click', (ev) => {
  itemActivity(jhValue('#itemviewid'))
})

jhEvent('#itemactivityload', 'click', (ev) => {
  fillActivity(jhValue('#itemactivityid'))
})
