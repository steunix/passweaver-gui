import * as PW from './passweaver-gui.js'
import * as JH from './jh.js'
import * as Crypt from './crypt.js'

const domCache = {
  itemActivityDialog: JH.query('#itemactivitydialog'),
  itemActivityTable: JH.query('#itemactivitytable'),
  itemActivityLoadButton: JH.query('#itemactivityload'),
  itemActivityId: JH.query('#itemactivityid'),
  itemActivityButton: JH.query('#itemviewactivity'),
  itemActivityTableBody: JH.query('#itemactivitytable tbody')
}

export async function itemCopyLink (itm) {
  const resp = await JH.http(`/api/items/${itm}/link`)

  // Check response
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body?.data?.link) {
    navigator.clipboard.writeText(body.data.link)
    PW.showToast('success', 'Item link copied to clipboard')
  }
}

async function fillItemActivity (itm) {
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
      row += `<td>${JH.sanitize(evt.user_description || '')}</td>`
      row += `<td>${JH.sanitize(evt.action_description || '')}</td>`
      row += `<td>${JH.sanitize(evt.note || '')}</td>`
    }
    domCache.itemActivityTableBody.innerHTML += row
  }

  if (!body.data.length || body.data.length < 50) {
    domCache.itemActivityTableBody.innerHTML += '<tr><td colspan="99">No other activity found</td></tr>'
    JH.disable(domCache.itemActivityLoadButton)
  }
}

/**
 * Show item activity dialog
 * @param {*} itm Item id
 */
export async function itemActivityShow (itm) {
  domCache.itemActivityTableBody.innerHTML = ''
  domCache.itemActivityDialog.show()
  JH.enable(domCache.itemActivityLoadButton)

  JH.value(domCache.itemActivityId, itm)
  await fillItemActivity(itm)
}

JH.event(domCache.itemActivityLoadButton, 'click', (ev) => {
  fillItemActivity(JH.value(domCache.itemActivityId))
})

/**
 * Set favorite flag for item
 * @param {string} itm Item id
 */
export async function setFavorite (itm, favorite) {
  const resp = await JH.http(`/api/itemfavorite/${itm}`, {
    _csrf: PW.getCSRFToken(),
    favorite
  })

  // Check response
  if (!await PW.checkResponse(resp)) {
    return false
  }
  return true
}

/**
 * Set enterprise flag for item
 * @param {string} itm Item id
 */
export async function setEnterprise (itm, enterprise) {
  const resp = await JH.http(`/api/itementerprise/${itm}`, {
    _csrf: PW.getCSRFToken(),
    enterprise
  })

  // Check response
  if (!await PW.checkResponse(resp)) {
    return false
  }

  if (!enterprise) {
    return true
  }

  const key = Crypt.createKey()

  const resp2 = await JH.http(`/api/items/${itm}?key=${encodeURIComponent(key)}`)
  if (!await PW.checkResponse(resp2)) {
    return false
  }

  const body = await resp2.json()

  // Decrypt data using token
  const decrypted = JSON.parse(await Crypt.decryptBlock(body.data.data, key))

  if (body.status === 'success') {
    const edata = {
      title: body.data.title,
      type: body.data.type,
      description: decrypted.description,
      email: decrypted.email,
      url: decrypted.url,
      user: decrypted.user
    }

    const resp3 = await JH.http(`/api/itementerprisedata/${itm}`, {
      _csrf: PW.getCSRFToken(),
      data: JSON.stringify(edata)
    })
    if (!await PW.checkResponse(resp3)) {
      PW.showToast('danger', 'Failed to set enterprise data')
      return false
    }
  }

  return true
}
