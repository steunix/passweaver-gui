/* global */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let itemSearchTimeout

const domCache = {
  itemsTable: JH.query('#itemstable'),
  itemsTableBody: JH.query('#itemstable tbody'),
  itemsSearch: JH.query('#itemsearch'),
  itemNew: JH.query('#itemnew'),
  itemDialog: JH.query('#apikeydialog'),
  itemSecretDialog: JH.query('#apikeysecretdialog'),
  dialogNewApiKeyId: JH.query('#apikeynewid'),
  dialogSecretClose: JH.query('#apikeysecretclose'),
  dialogSecret: JH.query('#apikeysecret'),
  dialogItemId: JH.query('#apikeyid'),
  dialogDescription: JH.query('#apikeydescription'),
  dialogUserId: JH.query('#apikeyuserid'),
  dialogExpiresAt: JH.query('#apikeyexpiresat'),
  dialogActive: JH.query('#apikeyactive'),
  dialogSave: JH.query('#apikeysave'),
  dialogCancel: JH.query('#apikeycancel')
}

async function usersSelectOptions () {
  const resp = await JH.http('/api/userslist')
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  let options = ''
  for (const usr of body.data) {
    options += `<sl-option value="${usr.id}">${JH.sanitize(usr.lastname + ' ' + usr.firstname)}</sl-option>`
  }
  domCache.dialogUserId.innerHTML = options
}

async function fillItems () {
  PW.setTableLoading(domCache.itemsTable)

  const search = JH.value(domCache.itemsSearch)
  const resp = await JH.http(`/api/apikeys?search=${search}`)
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
        `<sl-icon-button id='edititem-${itm.id}' title='Edit API key' name='pencil' data-id='${itm.id}'></sl-icon-button>` +
        `<sl-icon-button id='removeitem-${itm.id}' title='Delete API key' name='trash3' style='color:red;' data-id='${itm.id}'></sl-icon-button>` +
        '</td>' +
        `<td>${itm.id}</td>` +
        `<td>${JH.sanitize(itm.description)}</td>` +
        `<td>${itm.expiresat}</td>` +
        `<td>${itm.lastusedat || 'Never'}</td>` +
        `<td class='text-center'><sl-icon name='${itm.active ? 'check-lg' : 'x-lg'}' style='color:${itm.active ? 'green' : 'red'}'/></td>` +
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
    domCache.itemsTableBody.innerHTML = '<td colspan="99">No API key found</td>'
  }
}

async function itemSave () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: JH.value(domCache.dialogDescription),
    userid: JH.value(domCache.dialogUserId),
    expiresat: JH.value(domCache.dialogExpiresAt),
    active: domCache.dialogActive.hasAttribute('checked')
  }

  domCache.itemDialog.hide()
  let resp
  const itemid = JH.value(domCache.dialogItemId)
  if (itemid) {
    data.id = itemid
    resp = await JH.http(`/api/apikeys/${itemid}`, data, 'PATCH')
  } else {
    resp = await JH.http('/api/apikeys', data)
  }
  if (!await PW.checkResponse(resp)) {
    return
  }

  fillItems()

  if (!itemid) {
    const body = await resp.json()
    domCache.itemSecretDialog.show()
    JH.value(domCache.dialogNewApiKeyId, body.data.id)
    JH.value(domCache.dialogSecret, body.data.secret)
  }

  PW.showToast('success', 'API key ' + (itemid ? 'updated' : 'created'))
}

async function itemDialogShow (id) {
  JH.value('#apikeydialog sl-input,sl-textarea,sl-select', '')
  JH.value(domCache.dialogItemId, id || '')

  if (id) {
    itemEditFill(id)
  }

  domCache.itemDialog.show()
  dialogSaveEnable()
}

async function dialogSaveEnable () {
  if (JH.value(domCache.dialogDescription) === '' ||
      JH.value(domCache.dialogUserId) === ''
  ) {
    JH.disable(domCache.dialogSave)
  } else {
    JH.enable(domCache.dialogSave)
  }
}

async function itemRemove (id) {
  PW.confirmDialog('Delete API key', 'Are you sure you want to delete this API key?', async () => {
    const resp = await JH.http(`/api/apikeys/${id}`, { _csrf: PW.getCSRFToken() }, 'DELETE')
    if (!await PW.checkResponse(resp)) {
      return
    }

    fillItems()
    PW.showToast('success', 'API key removed')
  }, 'Delete', 'danger')
}

async function itemEditFill (id) {
  const resp = await JH.http(`/api/apikeys/${id}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()

  JH.value(domCache.dialogDescription, body.data.description)
  JH.value(domCache.dialogUserId, body.data.userid)
  JH.value(domCache.dialogExpiresAt, body.data.expiresat)
  if (!body.data.active) {
    domCache.dialogActive.removeAttribute('checked')
  } else {
    domCache.dialogActive.setAttribute('checked', 'checked')
  }

  dialogSaveEnable()
}

await fillItems()
await usersSelectOptions()

// Event handlers
JH.event(domCache.dialogCancel, 'click', (ev) => {
  domCache.itemDialog.hide()
})

JH.event(domCache.dialogSave, 'click', (ev) => {
  itemSave()
})

JH.event(domCache.itemsSearch, 'sl-input', (ev) => {
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
  domCache.dialogDescription, domCache.dialogExpiresAt
], 'keyup', dialogSaveEnable)

JH.event(domCache.dialogSecretClose, 'click', (ev) => {
  domCache.itemSecretDialog.hide()
})
