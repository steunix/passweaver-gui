var itemSearchTimeout

function fillItems() {
  $.get(`/api/itemslist/${currentFolder()}?search=${$("#itemsearch").val()}`,(resp)=>{
    $("#itemstable tbody tr").remove()

    // Personal password not yet created?
    if ( resp.httpStatusCode == "412" ) {
      currentPermissions = { read: false, write: false }
      personalPasswordCreateDialog()
      return
    }

    // Personal password not yet set?
    if ( resp.httpStatusCode == "417" ) {
      currentPermissions = { read: false, write: false }
      personalPasswordAskDialog()
      return
    }

    // Folder may not be accessible
    if ( !checkResponse(resp,403) ) {
      return
    }

    if ( resp.data.length ) {
      row = ""
      for ( const itm of resp.data ) {
        row += `<tr id='row-${itm.id}' data-id='${itm.id}'>`
        row += `<td class='border-end'>`
        row += `<sl-icon-button id='view-${itm.id}' name='file-earmark' title='View item' data-id='${itm.id}'></sl-icon-button>`
        if ( currentPermissions.write ) {
          row += `<sl-icon-button id='edit-${itm.id}' title='Edit item' name='pencil' data-id='${itm.id}'></sl-icon-button>`
          row += `<sl-icon-button id='remove-${itm.id}' title='Remove item' name='trash3' style="color:red;" data-id='${itm.id}'></sl-icon-button>`
          row += `<sl-icon-button id='clone-${itm.id}' title='Clone item' name='journal-plus' data-id='${itm.id}'></sl-icon-button>`
          row += `<sl-icon-button id='link-${itm.id}' title='Copy item link' name='link-45deg' data-id='${itm.id}'></sl-icon-button>`
        }
        row += `</td>`
        row += `<td id='title-${itm.id}' data-id='${itm.id}' class='border-start border-end'>${itm.title}</td>`
        row += `<td id='user-${itm.id}'>${itm.metadata}</td>`
        row += `<td class='border-end'><sl-copy-button title='Copy user to clipboard' from='user-${itm.id}'></sl-copy-button></td>`
        row += `<td id='password-${itm.id}'>****</td>`
        row += `<td><sl-copy-button id='passwordcopy-${itm.id}' title='Copy password to clipboard' data-id='${itm.id}' from='password-${itm.id}'></sl-copy-button></td>`
        row += `<td><sl-icon-button id='passwordshow-${itm.id}' title='Show/hide password' data-id='${itm.id}' name='eye'></sl-icon-button></td>`
        row += `</tr>`
      }
      document.querySelector("#itemstable tbody").innerHTML = row
    } else {
      document.querySelector("#itemstable tbody").innerHTML = "<tr><td colspan='99'>No item found</td></tr>"
    }

    // Install event handlers
    $("#itemstable tbody [id^=view]").on("click", (ev)=>{
      itemShow($(ev.currentTarget).data("id"))
    })
    $("#itemstable tbody [id^=edit]").on("click", (ev)=>{
      itemEditDialog($(ev.currentTarget).data("id"))
    })
    $("#itemstable tbody [id^=title]").on("dblclick", (ev)=>{
      itemShow($(ev.currentTarget).data("id"))
    })
    $("#itemstable tbody [id^=remove]").on("click", (ev)=>{
      itemRemove($(ev.currentTarget).data("id"))
    })
    $("#itemstable tbody [id^=clone]").on("click",(ev)=>{
      itemClone($(ev.currentTarget).data("id"))
    })
    $("#itemstable tbody [id^=link]").on("click",(ev)=>{
      itemCopyLink($(ev.currentTarget).data("id"))
    })
    $("#itemstable tbody [id^=passwordcopy]").on("click",(ev)=>{
      passwordCopy(ev)
    })
    $("#itemstable tbody [id^=passwordshow]").on("click",(ev)=>{
      passwordShow(ev)
    })

    // Folder cannot be removed if not empty
    if ( $("#itemstable [id^='row-']").length ) {
      $("#removefolder").attr("disabled","disabled")
    }
  })
}

function folderClicked(ev, selectonly) {
  // Read folder info
  $("#itemstable tbody tr").remove()
  $.get(`/api/folders/${currentFolder()}`,(resp)=>{

    // Folder may not be accessible
    if ( !checkResponse(resp,"403") ) {
      return
    }

    if ( resp.data && resp.data.permissions ) {
      currentPermissions = resp.data.permissions
    } else {
      currentPermissions = { read: false, write: false }
    }

    // Load items
    fillItems()

    if ( currentPermissions.write ) {
      $("#newitem").removeAttr("disabled")
      $("#newfolder").removeAttr("disabled")
      $("#removefolder").removeAttr("disabled")
      $("#editfolder").removeAttr("disabled")
    } else {
      $("#newitem").attr("disabled","disabled")
      $("#newfolder").attr("disabled","disabled")
      $("#removefolder").attr("disabled","disabled")
      $("#editfolder").attr("disabled","disabled")
    }
  })
}

function itemCreateDialog() {
  document.querySelector("#itemcreatedialog").show()
  $("#itemcreatedialog sl-input,sl-textarea").val("")
  itemCreateEnable()
}

function itemCreate() {
  document.querySelector("#itemcreatedialog").hide()

  let itemdata = {
    _csrf: getCSRFToken(),
    title: $("#newtitle").val(),
    email: $("#newemail").val(),
    description: $("#newdescription").val(),
    url: $("#newurl").val(),
    user: $("#newuser").val(),
    password: $("#newpassword").val()
  }

  $.post(`/api/itemnew/${currentFolder()}`, itemdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    if ( resp.data.id ) {
      fillItems()
      showToast("success","Item created")
    } else {
      errorDialog(resp.message)
    }
  })
}

function itemCreateEnable() {
  if ( $("#newtitle").val()=="" ) {
    $("#itemcreatesave").attr("disabled","disabled")
  } else {
    $("#itemcreatesave").removeAttr("disabled")
  }
}

function itemRemove(itm) {
  confirmDialog("Remove item", "Are you sure you want to remove this item?", ()=> {
    $.post("/api/itemremove/"+itm, {_csrf: getCSRFToken()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      fillItems()
    })
  })
}

function itemEditDialog(item) {
  document.querySelector("#itemeditdialog").show()
  $("#itemeditdialog sl-input,sl-textarea").val("")
  itemEditFill(item)
  itemEditEnable()
}

function itemEditFill(item) {
  $.get(`/api/items/${item}`, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    if ( resp.status=="success" ) {
      $("#itemeditid").val(item)
      $("#edittitle").val(resp.data.title)
      $("#editemail").val(resp.data.data.email)
      $("#editdescription").val(resp.data.data.description)
      $("#editurl").val(resp.data.data.url)
      $("#edituser").val(resp.data.data.user)
      $("#editpassword").val(resp.data.data.password)
    }

    itemEditEnable()
  })
}

function itemEditEnable() {
  if ( $("#edittitle").val()=="" ) {
    $("#itemeditsave").attr("disabled","disabled")
  } else {
    $("#itemeditsave").removeAttr("disabled")
  }
}

function itemEdit() {
  const id = document.querySelector("#itemeditid").value

  let itemdata = {
    _csrf: getCSRFToken(),
    title: $("#edittitle").val(),
    data: {
      description: $("#editdescription").val(),
      email: $("#editemail").val(),
      url: $("#editurl").val(),
      user: $("#edituser").val(),
      password: $("#editpassword").val()
    }
  }

  $.post(`/api/itemupdate/${id}`, itemdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    document.querySelector("#itemeditdialog").hide()
    fillItems()
  })
}

function toggleEditPassword() {
  if ( $("#editpassword").attr("type")=="password") {
    $("#editpassword").attr("type","text")
    passwordAccessed($("#itemeditid").val())
  } else {
    $("#editpassword").attr("type","password")
  }
}

function toggleViewPassword() {
  if ( $("#viewpassword").attr("type")=="password") {
    $("#viewpassword").attr("type","text")
    passwordAccessed($("#itemviewid").val())
  } else {
    $("#viewpassword").attr("type","password")
  }
}

function itemViewFill(item) {
  $.get(`/api/items/${item}`, (resp)=> {
    if ( !checkResponse(resp) ) {
      document.querySelector("#itemviewdialog").hide()
      return
    }

    $("#itemviewid").val(item)
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
  document.querySelector("#itemviewdialog").show()
  itemViewFill(item)
}

function itemClone(itm) {
  confirmDialog("Clone item", "Do you want to clone this item?", ()=>{
    $.post(`/api/items/${itm}/clone`, {_csrf: getCSRFToken()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      showToast("success","Item cloned")
      fillItems()
    })
  })
}

function itemCopyLink(itm) {
  navigator.clipboard.writeText(`${window.location.origin}/pages/items?viewitem=${itm}`)
  showToast("primary", "Item link copied to clipboard")
}

function findAndShowItem(itm) {
  itemViewFill(itm)
  document.querySelector("#itemviewdialog").show()
}

function personalPasswordCreateDialog() {
  document.querySelector("#personalpasswordnew").show()
}

function personalPasswordAskDialog() {
  document.querySelector("#personalpasswordset").show()
}

function personalPasswordCreateEnable() {
  if (
    $("#newpersonalpassword").val()=="" || $("#newpersonalpassword").val().length<8 || $("#newpersonalpassword").val()!=$("#newpersonalpasswordconfirm").val() ) {
      $("#personalpasswordcreate").attr("disabled","disabled")
  } else {
    $("#personalpasswordcreate").removeAttr("disabled")
  }
}

function personalPasswordCreate() {
  let data = {
    _csrf: getCSRFToken(),
    password: $("#newpersonalpassword").val()
  }

  $.post("/api/personalpassword", data, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    fillItems()
    showToast("success", "Personal password saved")
  })
}

function personalPasswordSet() {
  let data = {
    _csrf: getCSRFToken(),
    password: $("#personalpasswordask").val()
  }

  $.post("/api/personalunlock", data, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function passwordCopy(ev) {
  var item = $(ev.currentTarget).data("id")
  $.get(`/api/items/${item}`, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }
    passwordAccessed(item)
  })
}

function passwordShow(ev) {
  var item = $(ev.currentTarget).data("id")

  if ( $(`#password-${item}`).html()!=="****") {
    $(`#password-${item}`).html("****")
    return
  }

  $("[id^=password-]").html("****")
  $.get(`/api/items/${item}`, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    $(`#password-${item}`).html(resp.data.data.password)

    passwordAccessed(item)
  })
}

function passwordAccessed(item) {
  $.post("/api/events", {
    _csrf: getCSRFToken(),
    event: 'pwdread',
    itemtype: 'item',
    itemid: item
  })
}

fillFolders()

// Create
$("#newitem").on("click",(ev)=>{
  itemCreateDialog()
})
$("#itemcreatecancel").on("click",(ev)=>{
  document.querySelector("#itemcreatedialog").hide()
})
$("#itemcreatesave").on("click",(ev)=>{
  itemCreate()
})

// View
$("#newtitle").on("keyup",(ev)=>{
  itemCreateEnable()
})
$("#toggleviewpassword").on("click",(ev)=>{
  toggleViewPassword()
})

// Edit
$("#toggleeditpassword").on("click",(ev)=>{
  toggleEditPassword()
})
$("#edittitle").on("keyup",(ev)=>{
  itemEditEnable()
})
$("#itemeditcancel").on("click",(ev)=>{
  document.querySelector("#itemeditdialog").hide()
})
$("#itemeditsave").on("click",(ev)=>{
  itemEdit()
})

// Personal
$("#togglepersonalpassword").on("click",(ev)=>{
  togglePersonalPasswordSet()
})
$("#personalpasswordcancel").on("click",(ev)=>{
  document.querySelector("#personalpasswordnew").hide()
})
$("#personalpasswordsetcancel").on("click",(ev)=>{
  document.querySelector("#personalpasswordset").hide()
})
$("#personalpasswordcreate").on("click",(ev)=>{
  personalPasswordCreate()
})
$("#newpersonalpassword,#newpersonalpasswordconfirm").on("keyup",(ev)=>{
  personalPasswordCreateEnable()
})
$("#togglenewpersonalpassword").on("click",(ev)=>{
  togglePersonalPassword()
})
$("#togglenewpersonalpasswordconfirm").on("click",(ev)=>{
  togglePersonalPasswordConfirm()
})
$("#personalpasswordsetbutton").on("click",(ev)=>{
  personalPasswordSet()
})

$("#itemsearch").on("sl-input", (ev) => {
  if ( itemSearchTimeout ) {
    clearTimeout(itemSearchTimeout)
  }
  itemSearchTimeout = setTimeout(fillItems,250)
})

if ( $("#viewitem").length ) {
  setTimeout(()=>{ findAndShowItem($("#viewitem").val()) }, 200)
}

$("#copyviewpassword").on("click", (ev)=>{
  passwordAccessed($("#itemviewid").val())
})