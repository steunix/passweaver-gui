import * as PW from './passweaver-gui.js'

var userPickerTimeout = 0
var userCallback

export function show(callback) {
  userCallback = callback
  jhValue("#userpickersearch", "")
  jhQuery("#userpickertable tbody").innerHTML = ""
  jhQuery("#userpickerdialog").show()
  search()
}

export function hide() {
  jhQuery("#userpickerdialog").hide()
}

async function search() {
  const text = jhValue("#userpickersearch")

  const resp = await jhFetch(`/api/userslist/?search=${encodeURIComponent(text)}`)
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  jhQuery("#userpickertable tbody").innerHTML = ""
  const body = await resp.json()
  if ( body.data.length ) {
    var row = ""
    for ( const usr of body.data ) {
      row += `<tr id='row-${usr.id}' data-id='${usr.id}' style='cursor:pointer;'>`
      row += `<td><sl-icon-button id='user-${usr.id}' data-id='${usr.id}' name="arrow-right-circle"></sl-icon-button></td>`
      row += `<td>${usr.login}</td>`
      row += `<td>${usr.lastname} ${usr.firstname}</td>`
      row += "</tr>"
    }
    jhQuery("#userpickertable tbody").innerHTML = row
  }

  // Event handlers
  jhEvent("#userpickertable tbody tr[id^=row]", "dblclick", (ev)=>{
    userCallback(ev.currentTarget.getAttribute("data-id"))
  })
  jhEvent("#userpickertable tbody sl-icon-button[id^=user]", "click", (ev)=>{
    userCallback(ev.currentTarget.getAttribute("data-id"))
  })
}

jhEvent("#userpickersearch", "sl-input", (ev) => {
  if ( userPickerTimeout ) {
    clearTimeout(userPickerTimeout)
  }
  userPickerTimeout = setTimeout(async()=>{ await search() },250)
})
