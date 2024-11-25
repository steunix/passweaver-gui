import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let currentItemType

async function fillItemTypes () {
  const resp = await JH.http('/api/itemtypes')
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  JH.query('#itemtypestable tbody').innerHTML = ''

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
  JH.query('#itemtypestable tbody').innerHTML = row

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
  JH.query('#itemtypenewdialog').show()
  itemTypeCreateEnable()
}

function itemTypeCreateEnable () {
  if (JH.value('#itemtypenewdescription') === '') {
    JH.query('#itemtypenewsave').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#itemtypenewsave').removeAttribute('disabled')
  }
}

async function itemTypeCreate () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: JH.value('#itemtypenewdescription'),
    icon: JH.value('#itemtypenewicon')
  }

  JH.query('#itemtypenewdialog').hide()

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

  JH.value('#itemtypeeditdescription', body.data.description)
  JH.value('#itemtypeediticon', body.data.icon)
  JH.query('#itemtypeeditdialog').show()
  itemTypeEditEnable()
}

function itemTypeEditEnable () {
  if (JH.value('#itemtypeeditdescription') === '') {
    JH.query('#itemtypeeditsave').setAttribute('disabled', 'disabled')
  } else {
    JH.query('#itemtypeeditsave').removeAttribute('disabled')
  }
}

async function itemTypeEdit () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: JH.value('#itemtypeeditdescription'),
    icon: JH.value('#itemtypeediticon')
  }

  JH.query('#itemtypeeditdialog').hide()
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

JH.event('#additemtype', 'click', () => {
  itemTypeCreateDialog()
})
JH.event('#itemtypenewcancel', 'click', () => {
  JH.query('#itemtypenewdialog').hide()
})
JH.event('#itemtypenewdescription', 'keyup', () => {
  itemTypeCreateEnable()
})
JH.event('#itemtypenewsave', 'click', async () => {
  await itemTypeCreate()
})

JH.event('#itemtypeeditcancel', 'click', () => {
  JH.query('#itemtypeeditdialog').hide()
})
JH.event('#itemtypeeditsave', 'click', async () => {
  await itemTypeEdit()
})
JH.event('#itemtypeeditdescription', 'keyup', () => {
  itemTypeEditEnable()
})

JH.event('#clearcache', 'click', async () => {
  await clearCache()
})
