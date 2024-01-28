var groupPickerTimeout = 0

function searchGroups() {
  var text = $("#grouppickersearch").val()
  if ( text.length < 3 ) {
    return
  }

  $.get("/pages/groupslist/?search="+encodeURIComponent(text),(resp)=>{
    $("#grouppickertable tbody tr").remove()
    if ( resp.data.length ) {
      var row = ""
      for ( const grp of resp.data ) {
        row += `<tr ondblclick="javascript:groupPickerChoosen('${grp.id}')">`
        row += `<td><i class='fa-solid fa-circle-check text-success' onclick="javascript:groupPickerChoosen('${grp.id}')"></i></td>`
        row += `<td>${grp.description}</td>`
        row += "</tr>"
      }
      $("#grouppickertable tbody").append(row)
    }
  })
}

$("#grouppickersearch").on("keyup", (ev) => {
  if ( groupPickerTimeout ) {
    clearTimeout(groupPickerTimeout)
  }
  groupPickerTimeout = setTimeout(searchGroups,250)
})