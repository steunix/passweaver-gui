import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let groupPickerTimeout = 0
let userCallback

const domCache = {
  dialog: JH.query('#grouppickerdialog'),
  search: JH.query('#grouppickersearch'),
  table: JH.query('#grouppickertable'),
  tableBody: JH.query('#grouppickertable tbody')
}

export function show (callback) {
  userCallback = callback
  domCache.search.value = ''
  domCache.tableBody.innerHTML = ''
  domCache.dialog.show()
  search()
}

export function hide () {
  domCache.dialog.hide()
}

async function search () {
  PW.setTableLoading(domCache.table)

  const text = JH.value(domCache.search)

  const resp = await JH.http(`/api/groupslist/?search=${encodeURIComponent(text)}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  domCache.tableBody.innerHTML = ''
  const body = await resp.json()
  if (body.data.length) {
    let row = ''
    for (const grp of body.data) {
      row +=
        `<tr id='row-${grp.id}' data-id='${grp.id}' style='cursor:pointer'>` +
        `<td><sl-icon-button id='choose-${grp.id}' data-id='${grp.id}' name='arrow-right-circle'></sl-icon-button></td>` +
        `<td>${grp.description}</td>` +
        '</tr>'
    }
    domCache.tableBody.innerHTML = row

    // Install event handlers
    JH.event('#grouppickertable tbody tr[id^=row]', 'dblclick', (ev) => {
      userCallback(ev.currentTarget.getAttribute('data-id'))
    })
    JH.event('#grouppickertable tbody [id^=choose]', 'click', (ev) => {
      userCallback(ev.currentTarget.getAttribute('data-id'))
    })
  }
}

JH.event(domCache.search, 'sl-input', (ev) => {
  if (groupPickerTimeout) {
    clearTimeout(groupPickerTimeout)
  }
  groupPickerTimeout = setTimeout(async () => { await search() }, 250)
})
