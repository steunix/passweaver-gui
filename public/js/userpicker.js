var userPickerTimeout = 0

function userPickerShow() {
  const dialog = $("#userpickerdialog")
  $("#userpickersearch").val("")
  $("#userpickertable tbody tr").remove()
  dialog[0].show()
}

function userPickerHide() {
  const dialog = $("#userpickerdialog")
  dialog[0].hide()
}

function searchUsers() {
  var text = $("#userpickersearch").val()

  $.get("/api/userslist/?search="+encodeURIComponent(text),(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    $("#userpickertable tbody tr").remove()
    if ( resp.data.length ) {
      var row = ""
      for ( const usr of resp.data ) {
        row += `<tr id='row-${usr.id}' data-id='${usr.id}'>`
        row += `<td><sl-icon-button id='user-${usr.id}' data-id='${usr.id}' name="arrow-right-circle"></sl-icon-button></td>`
        row += `<td>${usr.login}</td>`
        row += `<td>${usr.lastname} ${usr.firstname}</td>`
        row += "</tr>"
      }
      $("#userpickertable tbody").append(row)
    }

    // Event handlers
    $("#userpickertable tbody tr[id^=row]").on("dblclick",(ev)=>{
      userPickerChoosen($(ev.currentTarget).data("id"))
    })
    $("#userpickertable tbody sl-icon-button[id^=user]").on("click",(ev)=>{
      userPickerChoosen($(ev.currentTarget).data("id"))
    })
  })
}

$("#userpickersearch").on("sl-input", (ev) => {
  if ( userPickerTimeout ) {
    clearTimeout(userPickerTimeout)
  }
  userPickerTimeout = setTimeout(searchUsers,250)
})
