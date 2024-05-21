var groupPickerTimeout = 0

function groupPickerShow() {
  const dialog = $("#grouppickerdialog")
  $("#grouppickersearch").val("")
  $("#grouppickertable tbody tr").remove()
  dialog[0].show()
}

function groupPickerHide() {
  const dialog = $("#grouppickerdialog")
  dialog[0].hide()
}

function searchGroups() {
  var text = $("#grouppickersearch").val()

  $.get("/api/groupslist/?search="+encodeURIComponent(text),(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    $("#grouppickertable tbody tr").remove()
    if ( resp.data.length ) {
      var row = ""
      for ( const grp of resp.data ) {
        row += `<tr id='row-${grp.id}' data-id='${grp.id}'>`
        row += `<td><sl-icon-button id='choose-${grp.id}' data-id='${grp.id}' name="arrow-right-circle"></sl-icon-button></td>`
        row += `<td>${grp.description}</td>`
        row += "</tr>"
      }
      $("#grouppickertable tbody").append(row)

      // Install event handlers
      $("#grouppickertable tbody tr[id^=row]").on("dblclick", (ev)=>{
        groupPickerChoosen($(ev.currentTarget).data("id"))
      })
      $("#grouppickertable tbody [id^=choose]").on("click", (ev)=>{
        groupPickerChoosen($(ev.currentTarget).data("id"))
      })
    }
  })
}

$("#grouppickersearch").on("sl-input", (ev) => {
  if ( groupPickerTimeout ) {
    clearTimeout(groupPickerTimeout)
  }
  groupPickerTimeout = setTimeout(searchGroups,250)
})
