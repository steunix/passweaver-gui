import * as PW from './passweaver-gui.js'
import * as JH from './jh.js'

const domCache = {
  itemActivityDialog: JH.query('#itemactivitydialog'),
  itemActivityTable: JH.query('#itemactivitytable'),
  itemActivityLoadButton: JH.query('#itemactivityload'),
  itemActivityId: JH.query('#itemactivityid'),
  itemActivityButton: JH.query('#itemviewactivity'),
  itemActivityTableBody: JH.query('#itemactivitytable tbody')
}

export function itemCopyLink (itm) {
  navigator.clipboard.writeText(`${window.location.origin}/pages/items?viewitem=${itm}`)
  PW.showToast('primary', 'Item link copied to clipboard')
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
