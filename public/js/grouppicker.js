var groupPickerTimeout = 0
var userCallback

function groupPickerShow(callback) {
  userCallback = callback
  $("#grouppickersearch").val("")
  $("#grouppickertable tbody tr").remove()
  document.querySelector("#grouppickerdialog").show()
}

function groupPickerHide() {
  document.querySelector("#grouppickerdialog").hide()
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
        row +=
          `<tr id='row-${grp.id}' data-id='${grp.id}'>`+
          `<td><sl-icon-button id='choose-${grp.id}' data-id='${grp.id}' name="arrow-right-circle"></sl-icon-button></td>`+
          `<td>${grp.description}</td>`+
          `</tr>`
      }
      $("#grouppickertable tbody").append(row)

      // Install event handlers
      $("#grouppickertable tbody tr[id^=row]").on("dblclick", (ev)=>{
        userCallback($(ev.currentTarget).data("id"))
      })
      $("#grouppickertable tbody [id^=choose]").on("click", (ev)=>{
        userCallback($(ev.currentTarget).data("id"))
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
