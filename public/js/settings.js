import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let currentItemType

const domCache = {
  itemTypesTable: JH.query('#itemtypestable'),
  itemTypesTableBody: JH.query('#itemtypestable tbody'),
  itemTypeNewDialog: JH.query('#itemtypenewdialog'),
  itemTypeNewDescription: JH.query('#itemtypenewdescription'),
  itemTypeNewIcon: JH.query('#itemtypenewicon'),
  itemTypeNewSaveButton: JH.query('#itemtypenewsave'),
  itemTypeEditDialog: JH.query('#itemtypeeditdialog'),
  itemTypeEditDescription: JH.query('#itemtypeeditdescription'),
  itemTypeEditIcon: JH.query('#itemtypeediticon'),
  itemTypeEditSaveButton: JH.query('#itemtypeeditsave'),
  readOnlyStatus: JH.query('#readonlystatus'),
  readOnlySetButton: JH.query('#readonlymode'),
  readOnlyUnsetButton: JH.query('#readwritemode'),
  systemLockStatus: JH.query('#systemlockstatus'),
  systemLockSetButton: JH.query('#systemlock'),
  systemLockUnsetButton: JH.query('#systemunlock'),
  clearCacheButton: JH.query('#clearcache'),
  itemTypeNewButton: JH.query('#additemtype')
}

async function fillStatuses () {
  const resp1 = await JH.http('/api/systemlockstatus')
  const resp2 = await JH.http('/api/readonlystatus')

  const body1 = await resp1.json()
  const body2 = await resp2.json()

  if (body1.data.locked) {
    domCache.systemLockStatus.innerHTML = 'System is locked'
    domCache.systemLockStatus.setAttribute('variant', 'danger')
  } else {
    domCache.systemLockStatus.innerHTML = 'System is unlocked'
    domCache.systemLockStatus.setAttribute('variant', 'success')
  }

  if (body2.data.readonly) {
    domCache.readOnlyStatus.innerHTML = 'System is in read-only mode'
    domCache.readOnlyStatus.setAttribute('variant', 'danger')
  } else {
    domCache.readOnlyStatus.innerHTML = 'System is in read-write mode'
    domCache.readOnlyStatus.setAttribute('variant', 'success')
  }
}

async function fillItemTypes () {
  const resp = await JH.http('/api/itemtypes')
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  domCache.itemTypesTableBody.innerHTML = ''

  let row = ''
  if (!body.data.length) {
    return
  }

  for (const itm of body.data) {
    row +=
      `<tr data-id='${itm.id}' style='cursor:pointer'>` +
      `<td><wa-icon-button id='edititemtype-${itm.id}' title='Edit item type' name='pencil' data-id='${itm.id}'></wa-icon-button></td>` +
      `<td class='border-end'><wa-icon-button id='removeitemtype-${itm.id}' title='Delete item type' name='trash3' style='color:red;' data-id='${itm.id}'></wa-icon-button></td>` +
      `<td>${itm.description}</td>` +
      `<td>${itm.icon}</td>` +
      `<td><wa-icon name='${itm.icon}'></wa-icon></td>` +
      '</tr>'
  }
  domCache.itemTypesTableBody.innerHTML = row

  JH.event('[id^=removeitemtype-]', 'click', async (ev) => {
    itemTypeRemove(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('[id^=edititemtype-]', 'click', async (ev) => {
    itemTypeEditDialog(ev.currentTarget.getAttribute('data-id'))
  })
}

await fillItemTypes()
await fillStatuses()

function itemTypeCreateDialog () {
  JH.value('#itemtypenewdialog wa-input', '')
  domCache.itemTypeNewDialog.show()
  itemTypeCreateEnable()
}

function itemTypeCreateEnable () {
  if (JH.value(domCache.itemTypeNewDescription) === '') {
    JH.disable(domCache.itemTypeNewSaveButton)
  } else {
    JH.enable(domCache.itemTypeNewSaveButton)
  }
}

async function itemTypeCreate () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: JH.value(domCache.itemTypeNewDescription),
    icon: JH.value(domCache.itemTypeNewIcon)
  }

  domCache.itemTypeNewDialog.hide()

  const resp = await JH.http('/api/itemtypes', data)
  if (!await PW.checkResponse(resp)) {
    return
  }

  await fillItemTypes()
}

async function itemTypeRemove (itemtype) {
  PW.confirmDialog('Delete item type', 'Do you want to delete this item type? All items having this type will be reset to null item type', async () => {
    const data = {
      _csrf: PW.getCSRFToken()
    }

    const resp = await JH.http(`/api/itemtypes/${itemtype}`, data, 'DELETE')
    if (!await PW.checkResponse(resp)) {
      return
    }

    PW.showToast('success', 'Item type deleted')
    await fillItemTypes()
  }, 'Delete', 'danger')
}

async function itemTypeEditDialog (itemtype) {
  currentItemType = itemtype
  const resp = await JH.http(`/api/itemtypes/${itemtype}`)
  if (!await PW.checkResponse(resp)) {
    return
  }
  const body = await resp.json()
  if (!body.data) {
    return
  }

  domCache.itemTypeEditDescription.value = body.data.description
  domCache.itemTypeEditIcon.value = body.data.icon
  domCache.itemTypeEditDialog.show()
  itemTypeEditEnable()
}

function itemTypeEditEnable () {
  if (JH.value(domCache.itemTypeEditDescription) === '') {
    JH.disable(domCache.itemTypeEditSaveButton)
  } else {
    JH.enable(domCache.itemTypeEditSaveButton)
  }
}

async function itemTypeEdit () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: JH.value(domCache.itemTypeEditDescription),
    icon: JH.value(domCache.itemTypeEditIcon)
  }

  domCache.itemTypeEditDialog.hide()
  const resp = await JH.http(`/api/itemtypes/${currentItemType}`, data, 'PATCH')
  if (!await PW.checkResponse(resp)) {
    return
  }

  PW.showToast('success', 'Item type updated')
  await fillItemTypes()
}

async function clearCache () {
  const data = {
    _csrf: PW.getCSRFToken()
  }

  PW.confirmDialog('Clear cache', 'Are you sure to clear the cache?', async () => {
    const resp = await JH.http('/api/clearcache', data)
    if (!await PW.checkResponse(resp)) {
      return
    }

    PW.showToast('success', 'Cache cleared')
  })
}

async function systemLock (lock) {
  const resp = await JH.http('/api/systemlock', { _csrf: PW.getCSRFToken(), lock })
  if (!await PW.checkResponse(resp)) {
    return
  }

  if (lock) {
    window.location = '/logout'
  }
  fillStatuses()
}

async function systemReadonly (readonly) {
  const resp = await JH.http('/api/systemreadonly', { _csrf: PW.getCSRFToken(), readonly })
  if (!await PW.checkResponse(resp)) {
    return
  }
  fillStatuses()
}

JH.event(domCache.itemTypeNewButton, 'click', itemTypeCreateDialog)

JH.event(domCache.itemTypeNewDescription, 'keyup', itemTypeCreateEnable)
JH.event(domCache.itemTypeNewSaveButton, 'click', async () => {
  await itemTypeCreate()
})

JH.event(domCache.itemTypeEditSaveButton, 'click', async () => {
  await itemTypeEdit()
})
JH.event(domCache.itemTypeEditDescription, 'keyup', itemTypeEditEnable)

JH.event(domCache.clearCacheButton, 'click', async () => {
  await clearCache()
})

JH.event(domCache.systemLockSetButton, 'click', async (ev) => { await systemLock(true) })
JH.event(domCache.systemLockUnsetButton, 'click', async (ev) => { await systemLock(false) })

JH.event(domCache.readOnlySetButton, 'click', async (ev) => { await systemReadonly(true) })
JH.event(domCache.readOnlyUnsetButton, 'click', async (ev) => { await systemReadonly(false) })
