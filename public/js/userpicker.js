var userPickerTimeout = 0

function searchUsers() {
  var text = $("#userpickersearch").val()
  if ( text.length < 3 ) {
    return
  }

  $.get("/pages/userslist/?search="+encodeURIComponent(text),(resp)=>{
    $("#userpickertable tbody tr").remove()
    if ( resp.data.length ) {
      var row = ""
      for ( const usr of resp.data ) {
        row += `<tr ondblclick="javascript:userPickerChoosen('${usr.id}')">`
        row += `<td><i class='fa-solid fa-circle-check text-success' onclick="javascript:userPickerChoosen('${usr.id}')"></i></td>`
        row += `<td>${usr.login}</td>`
        row += `<td>${usr.lastname} ${usr.firstname}</td>`
        row += "</tr>"
      }
      $("#userpickertable tbody").append(row)
    }
  })
}

$("#userpickersearch").on("keyup", (ev) => {
  if ( userPickerTimeout ) {
    clearTimeout(userPickerTimeout)
  }
  userPickerTimeout = setTimeout(searchUsers,250)
})