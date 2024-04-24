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
        row += `<td><i id='view-${itm.id}' class='fa-solid fa-circle-info text-primary' data-bs-toggle="modal" data-bs-target="#viewitemdialog" data-id='${itm.id}'></i></td>`
        row += "<td></td><td></td>"
        row += `<td class='border-start'>${itm.folderInfo.description}</td>`
        row += `<td>${itm.title}</td></tr>`
      }
      $("#itemstable tbody").append(row)
    }

    // Install event handlers
    $("#itemstable tbody tr[id^=row]").on("dblclick", (ev)=>{
      itemShow($(ev.currentTarget).data("id"))
    })
    $("#itemstable tbody i[id^=remove]").on("click", (ev)=>{
      itemRemove($(ev.currentTarget).data("id"))
    })

    loadingHide($("#itemstable"))
  })
}

function itemEditFill(item) {
  $("#itemeditid").val(item)

  $.get("/api/items/"+item, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    if ( resp.status=="success" ) {
      $("#edittitle").val(resp.data.title)
      $("#editemail").val(resp.data.data.email)
      $("#editdescription").val(resp.data.data.description)
      $("#editurl").val(resp.data.data.url)
      $("#edituser").val(resp.data.data.user)
      $("#editpassword").val(resp.data.data.password)
    }
  })
}

function itemEditEnable() {
  if ( $("#edittitle").val()=="" ) {
    $("#itemedit").attr("disabled","disabled")
  } else {
    $("#itemedit").removeAttr("disabled")
  }
}

function itemEdit() {
  let itemdata = {
    _csrf: $("#_csrf").val(),
    title: $("#edittitle").val(),
    data: {
      description: $("#editdescription").val(),
      email: $("#editemail").val(),
      url: $("#editurl").val(),
      user: $("#edituser").val(),
      password: $("#editpassword").val()
    }
  }

  $.post("/api/itemupdate/"+$("#itemeditid").val(), itemdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function toggleEditPassword() {
  if ( $("#editpassword").attr("type")=="password") {
    $("#editpassword").attr("type","text")
  } else {
    $("#editpassword").attr("type","password")
  }
}

function toggleViewPassword() {
  if ( $("#viewpassword").attr("type")=="password") {
    $("#viewpassword").attr("type","text")
  } else {
    $("#viewpassword").attr("type","password")
  }
}

function itemViewFill(item) {
  $.get("/api/items/"+item, (resp)=> {
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
  if ( window.getSelection() ) {
    window.getSelection().empty()
  }
  $("#view-"+item).click()
}

$(function() {
  // Get the item data to be edited
  $("#edititemdialog").on("show.bs.modal", (ev)=> {
    itemEditFill($(ev.relatedTarget).data("id"))
  })

  // Autofocus
  $("#edititemdialog").on("shown.bs.modal", (ev)=> {
    $(this).find("[autofocus]").focus()
  })

  // Get the item data to be shown
  $("#viewitemdialog").on("show.bs.modal", (ev)=> {
    itemViewFill($(ev.relatedTarget).data("id"))
  })
})

$(()=>{
  // Event handlers
  $("#toggleviewpassword").on("click",(ev)=>{
    toggleViewPassword()
  })
  $("#itemedit").on("click",(ev)=>{
    itemEdit()
  })
  $("#toggleeditpassword").on("click",(ev)=>{
    toggleEditPassword()
  })
  $("#edittitle").on("keyup",(ev)=>{
    itemEditEnable()
  })

  $("#itemsearch").on("keyup", (ev) => {
    if ( itemSearchTimeout ) {
      clearTimeout(itemSearchTimeout)
    }
    if ( $("#itemsearch").val().length>2 ) {
      itemSearchTimeout = setTimeout(fillItems,250)
    }
  })
})