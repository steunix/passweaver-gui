var itemSearchTimeout

function fillItems() {
  loadingShow($("#itemstable"))

  $("#itemstable tbody tr").remove()

  $.get("/api/itemssearch?search="+$("#itemsearch").val(),(resp)=>{
    // Folder may not be accessible
    if ( !checkResponse(resp,403) ) {
      return
    }

    if ( resp.data.length ) {
      row = ""
      for ( const itm of resp.data ) {
        row += `<tr id='row-${itm.id}' data-id='${itm.id}'>`
        row += `<td><sl-icon-button id='view-${itm.id}' title='View item' name='file-earmark' data-id='${itm.id}'></sl-icon-button></td>`
        row += `<td class='border-start'>${itm.folder.description}</td>`
        row += `<td>${itm.title}</td></tr>`
      }
      $("#itemstable tbody").append(row)
    }

    // Install event handlers
    $("#itemstable tbody tr[id^=row]").on("dblclick", (ev)=>{
      itemShow($(ev.currentTarget).data("id"))
    })
    $("#itemstable tbody [id^=view]").on("click", (ev)=>{
      itemShow($(ev.currentTarget).data("id"))
    })

    loadingHide($("#itemstable"))
  })
}

function toggleViewPassword() {
  if ( $("#viewpassword").attr("type")=="password") {
    $("#viewpassword").attr("type","text")
  } else {
    $("#viewpassword").attr("type","password")
  }
}

function itemViewFill(item) {
  $.get(`/api/items/${item}`, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    $("#viewtitle").val(resp.data.title)
    $("#viewemail").val(resp.data.data.email)
    $("#viewdescription").val(resp.data.data.description)
    $("#viewurl").val(resp.data.data.url)
    $("#viewuser").val(resp.data.data.user)
    $("#viewpassword").val(resp.data.data.password).attr("type","password")
  })
}

function itemShow(item) {
  debugger
  if ( window.getSelection() ) {
    window.getSelection().empty()
  }
  document.querySelector("#itemviewdialog").show()
  itemViewFill(item)
}

$(()=>{
  // Event handlers
  $("#itemsearch").on("sl-input", (ev) => {
    if ( itemSearchTimeout ) {
      clearTimeout(itemSearchTimeout)
    }
    if ( $("#itemsearch").val().length>2 ) {
      itemSearchTimeout = setTimeout(fillItems,250)
    }
  })
})