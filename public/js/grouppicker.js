var groupPickerTimeout = 0
var userCallback

export function show(callback) {
  userCallback = callback
  jhValue("#grouppickersearch", "")
  jhQuery("#grouppickertable tbody").innerHTML = ""
  jhQuery("#grouppickerdialog").show()
}

export function hide() {
  jhQuery("#grouppickerdialog").hide()
}

async function search() {
  const text = jhValue("#grouppickersearch")

  const resp = await jhFetch(`/api/groupslist/?search=${ encodeURIComponent(text) }`)
  if ( !await checkResponse(resp) ) {
    return
  }

  jhQuery("#grouppickertable tbody").innerHTML = ""
  const body = await resp.json()
  if ( body.data.length ) {
    var row = ""
    for ( const grp of body.data ) {
      row +=
        `<tr id='row-${grp.id}' data-id='${grp.id}'>`+
        `<td><sl-icon-button id='choose-${grp.id}' data-id='${grp.id}' name="arrow-right-circle"></sl-icon-button></td>`+
        `<td>${grp.description}</td>`+
        `</tr>`
    }
    jhQuery("#grouppickertable tbody").innerHTML = row

    // Install event handlers
    jhEvent("#grouppickertable tbody tr[id^=row]", "dblclick", (ev)=>{
      userCallback(ev.currentTarget.getAttribute("data-id"))
    })
    jhEvent("#grouppickertable tbody [id^=choose]", "click", (ev)=>{
      userCallback(ev.currentTarget.getAttribute("data-id"))
    })
  }
}

jhEvent("#grouppickersearch", "sl-input", (ev) => {
  if ( groupPickerTimeout ) {
    clearTimeout(groupPickerTimeout)
  }
  groupPickerTimeout = setTimeout(async()=>{ await search() },250)
})
