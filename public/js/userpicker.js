var userPickerTimeout = 0

function searchUsers() {
  var text = $("#userpickersearch").val()
  if ( text.length < 3 ) {
    return
  }

  $.get("/api/userslist/?search="+encodeURIComponent(text),(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    $("#userpickertable tbody tr").remove()
    if ( resp.data.length ) {
      var row = ""
      for ( const usr of resp.data ) {
        row += `<tr id='row-${usr.id}' data-id='${usr.id}'>`
        row += `<td><i id='user-${usr.id}' data-id='${usr.id}' class='fa-solid fa-circle-check text-success'></i></td>`
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
    $("#userpickertable tbody i[id^=user]").on("click",(ev)=>{
      userPickerChoosen($(ev.currentTarget).data("id"))
    })
  })
}

$("#userpickersearch").on("keyup", (ev) => {
  if ( userPickerTimeout ) {
    clearTimeout(userPickerTimeout)
  }
  userPickerTimeout = setTimeout(searchUsers,250)
})

$("#userpickerc")