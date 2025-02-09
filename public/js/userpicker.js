import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let userPickerTimeout = 0
let userCallback

const domCache = {
  dialog: JH.query('#userpickerdialog'),
  search: JH.query('#userpickersearch'),
  table: JH.query('#userpickertable'),
  tableBody: JH.query('#userpickertable tbody')
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

  const resp = await JH.http(`/api/userslist/?search=${encodeURIComponent(text)}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  domCache.tableBody.innerHTML = ''
  const body = await resp.json()
  if (body.data.length) {
    let row = ''
    for (const usr of body.data) {
      row += `<tr id='row-${usr.id}' data-id='${usr.id}' data-desc='${usr.lastname} ${usr.firstname}' style='cursor:pointer;'>`
      row += `<td><sl-icon-button id='user-${usr.id}' data-id='${usr.id}' data-desc='${usr.lastname} ${usr.firstname}' name='arrow-right-circle'></sl-icon-button></td>`
      row += `<td>${usr.login}</td>`
      row += `<td>${usr.lastname} ${usr.firstname}</td>`
      row += '</tr>'
    }
    JH.query('#userpickertable tbody').innerHTML = row
  }

  // Event handlers
  JH.event('#userpickertable tbody tr[id^=row]', 'dblclick', (ev) => {
    userCallback(ev.currentTarget.getAttribute('data-id'), ev.currentTarget.getAttribute('data-desc'))
  })
  JH.event('#userpickertable tbody sl-icon-button[id^=user]', 'click', (ev) => {
    userCallback(ev.currentTarget.getAttribute('data-id'), ev.currentTarget.getAttribute('data-desc'))
  })
}

JH.event(domCache.search, 'sl-input', (ev) => {
  if (userPickerTimeout) {
    clearTimeout(userPickerTimeout)
  }
  userPickerTimeout = setTimeout(async () => { await search() }, 250)
})
