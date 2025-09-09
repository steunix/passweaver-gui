/* global */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let itemSearchTimeout

const domCache = {
  itemsTable: JH.query('#itemstable'),
  itemsTableBody: JH.query('#itemstable tbody'),
  itemsSearch: JH.query('#itemsearch'),
  itemNew: JH.query('#itemnew'),
  itemDialog: JH.query('#itemtypedialog'),
  dialogItemId: JH.query('#itdid'),
  dialogDescription: JH.query('#itddescription'),
  dialogIcon: JH.query('#itdicon'),
  dialogSave: JH.query('#itdsave'),
  dialogCancel: JH.query('#itdcancel')
}

async function fillItems () {
  PW.setTableLoading(domCache.itemsTable)

  const search = JH.value(domCache.itemsSearch)
  const resp = await JH.http(`/api/itemtypes?search=${search}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()

  if (body.data.length) {
    let row = ''
    for (const itm of body.data) {
      row +=
        `<tr data-id='${itm.id}' style='cursor:pointer'>` +
        '<td>' +
        `<wa-button appearance='plain' size='small' title='Edit'><wa-icon id='edititem-${itm.id}' name='edit' data-id='${itm.id}'></wa-icon></wa-button>` +
        `<wa-button appearance='plain' size='small' title='Delete'><wa-icon id='removeitem-${itm.id}' name='trash' style='color:red;' data-id='${itm.id}'></wa-icon></wa-button>` +
        '</td>' +
        `<td>${JH.sanitize(itm.description)}</td>` +
        `<td>${JH.sanitize(itm.icon)}</td>` +
        `<td><wa-icon name='${itm.icon}'></wa-icon></td>` +
        '</tr>'
    }
    domCache.itemsTableBody.innerHTML = row

    // Install event handlers
    JH.event('#itemstable tbody tr [id^=edititem]', 'click', (ev) => {
      itemDialogShow(ev.currentTarget.getAttribute('data-id'))
    })
    JH.event('#itemstable tbody tr [id^=removeitem]', 'click', (ev) => {
      itemRemove(ev.currentTarget.getAttribute('data-id'))
    })
  } else {
    domCache.itemsTableBody.innerHTML = '<td colspan="99">No item type found</td>'
  }
}

async function itemSave () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: JH.value(domCache.dialogDescription),
    icon: JH.value(domCache.dialogIcon)
  }

  domCache.itemDialog.open = false
  let resp
  const itemid = JH.value(domCache.dialogItemId)
  if (itemid) {
    data.id = itemid
    resp = await JH.http(`/api/itemtypes/${itemid}`, data, 'PATCH')
  } else {
    resp = await JH.http('/api/itemtypes', data)
  }
  if (!await PW.checkResponse(resp)) {
    return
  }

  fillItems()

  PW.showToast('success', 'Item type ' + (itemid ? 'updated' : 'created'))
}

async function itemDialogShow (id) {
  JH.value('#itemtypedialog aw-input,aw-textarea,aw-select', '')
  JH.value(domCache.dialogItemId, id || '')

  if (id) {
    itemEditFill(id)
  }

  domCache.itemDialog.open = true
  dialogSaveEnable()
}

async function dialogSaveEnable () {
  if (JH.value(domCache.dialogDescription) === '') {
    JH.disable(domCache.dialogSave)
  } else {
    JH.enable(domCache.dialogSave)
  }
}

async function itemRemove (id) {
  PW.confirmDialog('Delete item type', 'Do you want to delete this item type? All items having this type will be reset to null item type', async () => {
    const resp = await JH.http(`/api/itemtypes/${id}`, { _csrf: PW.getCSRFToken() }, 'DELETE')
    if (!await PW.checkResponse(resp)) {
      return
    }

    fillItems()
    PW.showToast('success', 'Item type removed')
  }, 'Delete', 'danger')
}

async function itemEditFill (id) {
  const resp = await JH.http(`/api/itemtypes/${id}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()

  JH.value(domCache.dialogDescription, body.data.description)
  JH.value(domCache.dialogIcon, body.data.icon)

  dialogSaveEnable()
}

await fillItems()

// Event handlers
JH.event(domCache.dialogCancel, 'click', (ev) => {
  domCache.itemDialog.open = false
})

JH.event(domCache.dialogSave, 'click', (ev) => {
  itemSave()
})

JH.event(domCache.itemsSearch, 'input', (ev) => {
  if (itemSearchTimeout) {
    clearTimeout(itemSearchTimeout)
  }
  itemSearchTimeout = setTimeout(() => {
    domCache.itemsTableBody.innerHTML = ''
    fillItems()
  }, 250)
})

JH.event(domCache.itemNew, 'click', (ev) => {
  itemDialogShow()
})

JH.event([
  domCache.dialogDescription, domCache.dialogIcon
], 'keyup', dialogSaveEnable)
