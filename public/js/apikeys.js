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
  dialogIpWhitelist: JH.query('#apikeyipwhitelist'),
  dialogTimeWhitelist: JH.query('#apikeytimewhitelist'),
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
    options += `<wa-option value="${usr.id}">${JH.sanitize(usr.lastname + ' ' + usr.firstname)}</wa-option>`
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
        `<tr data-id='${itm.id}'>` +
        '<td>' +
        `<wa-button appearance='plain' size='small' title='Edit'><wa-icon id='edititem-${itm.id}' label='Edit API key' name='edit' data-id='${itm.id}'></wa-icon></wa-button>` +
        `<wa-button appearance='plain' size='small' title='Delete'><wa-icon id='removeitem-${itm.id}' label='Delete API key' name='trash' style='color:red;' data-id='${itm.id}'></wa-icon></wa-button>` +
        '</td>' +
        `<td id='id-${itm.id}'><wa-copy-button from='id-${itm.id}'></wa-copy-button>${itm.id}</td>` +
        `<td>${JH.sanitize(itm.description)}</td>` +
        `<td>${itm.expiresat}&nbsp;(<wa-relative-time date='${itm.expiresat}'></wa-relative-time>)</td>` +
        `<td>${itm.lastusedat || 'Never'}</td>` +
        (itm.active
          ? "<td><wa-badge variant='success'>Active</wa-badge></td>"
          : "<td><wa-badge variant='danger'>Inactive</wa-badge></td>") +
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
    ipwhitelist: JH.value(domCache.dialogIpWhitelist),
    timewhitelist: JH.value(domCache.dialogTimeWhitelist),
    expiresat: JH.value(domCache.dialogExpiresAt),
    active: JH.value(domCache.dialogActive) === 'A'
  }

  domCache.itemDialog.open = false
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
    domCache.itemSecretDialog.open = true
    JH.value(domCache.dialogNewApiKeyId, body.data.id)
    JH.value(domCache.dialogSecret, body.data.secret)
  }

  PW.showToast('success', 'API key ' + (itemid ? 'updated' : 'created'))
}

async function itemDialogShow (id) {
  JH.value('#apikeydialog wa-input,wa-textarea,wa-select', '')
  JH.value(domCache.dialogItemId, id || '')

  if (id) {
    itemEditFill(id)
  }

  domCache.itemDialog.open = true
  dialogSaveEnable()
}

async function dialogSaveEnable () {
  if (JH.value(domCache.dialogDescription) === '' ||
      JH.value(domCache.dialogUserId) === '' ||
      JH.value(domCache.dialogExpiresAt) === '' ||
      JH.value(domCache.dialogActive) === ''
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
  JH.value(domCache.dialogActive, body.data.active ? 'A' : 'I')
  JH.value(domCache.dialogIpWhitelist, body.data.ipwhitelist)
  JH.value(domCache.dialogTimeWhitelist, body.data.timewhitelist)

  dialogSaveEnable()
}

await fillItems()
await usersSelectOptions()

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
  domCache.dialogDescription, domCache.dialogExpiresAt
], 'keyup', dialogSaveEnable)

JH.event(domCache.dialogSecretClose, 'click', (ev) => {
  domCache.itemSecretDialog.open = false
})
