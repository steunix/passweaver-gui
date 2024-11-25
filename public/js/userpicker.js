import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let userPickerTimeout = 0
let userCallback

export function show (callback) {
  userCallback = callback
  JH.value('#userpickersearch', '')
  JH.query('#userpickertable tbody').innerHTML = ''
  JH.query('#userpickerdialog').show()
  search()
}

export function hide () {
  JH.query('#userpickerdialog').hide()
}

async function search () {
  const text = JH.value('#userpickersearch')

  const resp = await JH.http(`/api/userslist/?search=${encodeURIComponent(text)}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  JH.query('#userpickertable tbody').innerHTML = ''
  const body = await resp.json()
  if (body.data.length) {
    let row = ''
    for (const usr of body.data) {
      row += `<tr id='row-${usr.id}' data-id='${usr.id}' style='cursor:pointer;'>`
      row += `<td><sl-icon-button id='user-${usr.id}' data-id='${usr.id}' name='arrow-right-circle'></sl-icon-button></td>`
      row += `<td>${usr.login}</td>`
      row += `<td>${usr.lastname} ${usr.firstname}</td>`
      row += '</tr>'
    }
    JH.query('#userpickertable tbody').innerHTML = row
  }

  // Event handlers
  JH.event('#userpickertable tbody tr[id^=row]', 'dblclick', (ev) => {
    userCallback(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#userpickertable tbody sl-icon-button[id^=user]', 'click', (ev) => {
    userCallback(ev.currentTarget.getAttribute('data-id'))
  })
}

JH.event('#userpickersearch', 'sl-input', (ev) => {
  if (userPickerTimeout) {
    clearTimeout(userPickerTimeout)
  }
  userPickerTimeout = setTimeout(async () => { await search() }, 250)
})
