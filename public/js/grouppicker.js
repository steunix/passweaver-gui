var groupPickerTimeout = 0

function searchGroups() {
  var text = $("#grouppickersearch").val()
  if ( text.length < 3 ) {
    return
  }

  $.get("/api/groupslist/?search="+encodeURIComponent(text),(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    $("#grouppickertable tbody tr").remove()
    if ( resp.data.length ) {
      var row = ""
      for ( const grp of resp.data ) {
        row += `<tr id='row-${grp.id}' data-id='${grp.id}'>`
        row += `<td><i id='choose-${grp.id}' data-id='${grp.id}' class='fa-solid fa-circle-check text-success'"></i></td>`
        row += `<td>${grp.description}</td>`
        row += "</tr>"
      }
      $("#grouppickertable tbody").append(row)

      // Install event handlers
      $("#grouppickertable tbody tr[id^=row]").on("dblclick", (ev)=>{
        groupPickerChoosen($(ev.currentTarget).data("id"))
      })
      $("#grouppickertable tbody i[id^=choose]").on("click", (ev)=>{
        groupPickerChoosen($(ev.currentTarget).data("id"))
      })
    }
  })
}

$("#grouppickersearch").on("keyup", (ev) => {
  if ( groupPickerTimeout ) {
    clearTimeout(groupPickerTimeout)
  }
  groupPickerTimeout = setTimeout(searchGroups,250)
})