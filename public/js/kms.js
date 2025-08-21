/* global */

import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let kmsSearchTimeout

const kmsTypes = {
  1: 'Local key file',
  2: 'Google Cloud KMS'
}

const domCache = {
  itemsTable: JH.query('#itemstable'),
  itemsTableBody: JH.query('#itemstable tbody'),
  itemsSearch: JH.query('#itemsearch'),
  itemNew: JH.query('#itemnew'),
  kmsDialog: JH.query('#kmsdialog'),
  kmsDialogId: JH.query('#kmsdialogid'),
  kmsDescription: JH.query('#kmsdescription'),
  kmsType: JH.query('#kmstype'),
  kmsConfig: JH.query('#kmsconfig'),
  kmsActive: JH.query('#kmsactive'),
  kmsSave: JH.query('#kmssave'),
  kmsCancel: JH.query('#kmscancel')
}

async function fillItems () {
  PW.setTableLoading(domCache.itemsTable)

  const search = JH.value(domCache.itemsSearch)
  const resp = await JH.http(`/api/kms?search=${search}`)
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
        `<wa-button appearance='plain' size='small' title='Edit'><wa-icon id='edititem-${itm.id}' label='Edit KMS' name='edit' data-id='${itm.id}'></wa-icon></wa-button>` +
        `<wa-button appearance='plain' size='small' title='Delete'><wa-icon id='removeitem-${itm.id}' label='Delete KMS' name='trash' style='color:red;' data-id='${itm.id}'></wa-icon></wa-button>` +
        '</td>' +
        `<td>${JH.sanitize(itm.description)}</td>` +
        `<td>${kmsTypes[itm.type]}</td>` +
        (itm.active ? "<td><wa-badge variant='success'>Active</wa-badge></td>" : '<td></td>') +
        '</tr>'
    }
    domCache.itemsTableBody.innerHTML = row

    // Install event handlers
    JH.event('#itemstable tbody tr [id^=edititem]', 'click', (ev) => {
      kmsDialogShow(ev.currentTarget.getAttribute('data-id'))
    })
    JH.event('#itemstable tbody tr [id^=removeitem]', 'click', (ev) => {
      kmsRemove(ev.currentTarget.getAttribute('data-id'))
    })
  }
}

async function kmsSave () {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: JH.value(domCache.kmsDescription),
    type: JH.value(domCache.kmsType),
    config: JH.value(domCache.kmsConfig),
    active: domCache.kmsActive.hasAttribute('checked')
  }

  domCache.kmsDialog.open = false

  let resp
  const kmsid = JH.value(domCache.kmsDialogId)
  if (kmsid) {
    data.id = JH.value(domCache.kmsDialogId)
    resp = await JH.http(`/api/kms/${kmsid}`, data, 'PATCH')
  } else {
    resp = await JH.http('/api/kms', data)
  }
  if (!await PW.checkResponse(resp)) {
    return
  }

  fillItems()
  PW.showToast('success', 'KMS ' + (kmsid ? 'updated' : 'created'))
}

async function kmsDialogShow (kmsid) {
  JH.value('#kmsdialog wa-input,wa-textarea,wa-select', '')
  JH.value(domCache.kmsDialogId, kmsid || '')

  if (kmsid) {
    kmsEditFill(kmsid)
  }

  domCache.kmsDialog.show()
  kmsSaveEnable()
}

async function kmsSaveEnable () {
  try {
    JSON.parse(JH.value(domCache.kmsConfig))
  } catch (err) {
    JH.disable(domCache.kmsSave)
    return
  }

  if (JH.value(domCache.kmsDescription) === '' ||
      JH.value(domCache.kmsConfig) === '') {
    JH.disable(domCache.kmsSave)
  } else {
    JH.enable(domCache.kmsSave)
  }
}

async function kmsRemove (kmsid) {
  PW.confirmDialog('Delete KMS', 'Are you sure you want to delete this KMS?', async () => {
    const resp = await JH.http(`/api/kms/${kmsid}`, { _csrf: PW.getCSRFToken() }, 'DELETE')
    if (!await PW.checkResponse(resp)) {
      return
    }

    fillItems()
    PW.showToast('success', 'KMS removed')
  }, 'Delete', 'danger')
}

async function kmsEditFill (kmsid) {
  const resp = await JH.http(`/api/kms/${kmsid}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()

  JH.value(domCache.kmsDescription, body.data.description)
  JH.value(domCache.kmsType, '' + body.data.type)
  JH.value(domCache.kmsConfig, body.data.config)
  if (!body.data.active) {
    domCache.kmsActive.removeAttribute('checked')
  } else {
    domCache.kmsActive.setAttribute('checked', 'checked')
  }

  kmsSaveEnable()
}

await fillItems()

// Event handlers
JH.event([domCache.kmsDescription, domCache.kmsConfig], 'keyup', kmsSaveEnable)

JH.event(domCache.itemNew, 'click', (ev) => {
  kmsDialogShow()
})

JH.event(domCache.kmsCancel, 'click', (ev) => {
  domCache.kmsDialog.open = false
})

JH.event(domCache.kmsSave, 'click', (ev) => {
  kmsSave()
})

JH.event(domCache.itemsSearch, 'input', (ev) => {
  if (kmsSearchTimeout) {
    clearTimeout(kmsSearchTimeout)
  }
  kmsSearchTimeout = setTimeout(() => {
    domCache.itemsTableBody.innerHTML = ''
    fillItems()
  }, 250)
})
