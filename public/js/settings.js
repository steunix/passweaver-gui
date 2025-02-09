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
  itemTypeNewCancelButton: JH.query('#itemtypenewcancel'),
  itemTypeEditDialog: JH.query('#itemtypeeditdialog'),
  itemTypeEditDescription: JH.query('#itemtypeeditdescription'),
  itemTypeEditIcon: JH.query('#itemtypeediticon'),
  itemTypeEditSaveButton: JH.query('#itemtypeeditsave'),
  itemTypeEditCancelButton: JH.query('#itemtypeeditcancel'),
  clearCacheButton: JH.query('#clearcache'),
  itemTypeNewButton: JH.query('#additemtype')
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
      `<td><sl-icon-button id='edititemtype-${itm.id}' title='Edit item type' name='pencil' data-id='${itm.id}'></sl-icon-button></td>` +
      `<td class='border-end'><sl-icon-button id='removeitemtype-${itm.id}' title='Delete item type' name='trash3' style='color:red;' data-id='${itm.id}'></sl-icon-button></td>` +
      `<td>${itm.description}</td>` +
      `<td>${itm.icon}</td>` +
      `<td><sl-icon name='${itm.icon}'></sl-icon></td>` +
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

function itemTypeCreateDialog () {
  JH.value('#itemtypenewdialog sl-input', '')
  domCache.itemTypeNewDialog.show()
  itemTypeCreateEnable()
}

function itemTypeCreateEnable () {
  if (JH.value(domCache.itemTypeNewDescription) === '') {
    domCache.itemTypeNewSaveButton.setAttribute('disabled', 'disabled')
  } else {
    domCache.itemTypeNewSaveButton.removeAttribute('disabled')
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
    domCache.itemTypeEditSaveButton.setAttribute('disabled', 'disabled')
  } else {
    domCache.itemTypeEditSaveButton.removeAttribute('disabled')
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

JH.event(domCache.itemTypeNewButton, 'click', itemTypeCreateDialog)
JH.event(domCache.itemTypeNewCancelButton, 'click', () => {
  domCache.itemTypeNewDialog.hide()
})

JH.event(domCache.itemTypeNewDescription, 'keyup', itemTypeCreateEnable)
JH.event(domCache.itemTypeNewSaveButton, 'click', async () => {
  await itemTypeCreate()
})

JH.event(domCache.itemTypeEditCancelButton, 'click', () => {
  domCache.itemTypeEditDialog.hide()
})
JH.event(domCache.itemTypeEditSaveButton, 'click', async () => {
  await itemTypeEdit()
})
JH.event(domCache.itemTypeEditDescription, 'keyup', itemTypeEditEnable)

JH.event(domCache.clearCacheButton, 'click', async () => {
  await clearCache()
})
