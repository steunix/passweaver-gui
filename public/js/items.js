var currentFolder = ""
var currentPermissions = {
  read: false,
  write: false
}
var itemSearchTimeout
var folderSearchTimeout

function fillItems() {
  loadingShow($("#itemstable"))

  $("#itemstable tbody tr").remove()

  $.get("/pages/itemslist/"+currentFolder+"?search="+$("#itemsearch").val(),(resp)=>{
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
        row += `<td><i id='view-${itm.id}' title='View' class='v-action fa-solid fa-circle-info text-primary' data-bs-toggle="modal" data-bs-target="#viewitemdialog" data-id='${itm.id}'></i></td>`
        if ( currentPermissions.write ) {
          row += `<td><i id='edit-${itm.id}' title='Edit' class='v-action fa-solid fa-pen-to-square' data-bs-toggle="modal" data-bs-target="#edititemdialog" data-id='${itm.id}'></i></td>`
          row += `<td><i id='remove-${itm.id}' title='Remove' class='v-action fa-solid fa-trash text-danger' data-id='${itm.id}'></i></td>`
          row += `<td><i id='clone-${itm.id}' title='Clone' class='v-action fa-solid fa-file-circle-plus' data-id='${itm.id}' /></td>`
          row += `<td><i id='link-${itm.id}' title='Copy link' class='v-action fa-solid fa-link' data-id='${itm.id}' /></td>`
        } else {
          row += "<td></td><td></td><td></td><td></td>"
        }
        row += `<td id='title-${itm.id}' data-id='${itm.id}' class='border-start border-end'>${itm.title}</td>`
        row += `<td id='user-${itm.id}'>${itm.metadata}</td>`
        row += `<td><i class="v-action fa-solid fa-copy copytoclipboard" title='Copy user to clipboard' data-target='user-${itm.id}' /></td>`
        row += `<td id='password-${itm.id}'>****</td>`
        row += `<td><i id='passwordcopy-${itm.id}' class="v-action fa-solid fa-copy" title='Copy password to clipboard' data-id='${itm.id}' /></td>`
        row += `<td><i id='passwordshow-${itm.id}' class="v-action fa-solid fa-eye-slash" title='Show/hide password' data-id='${itm.id}' /></td>`
        row += `</tr>`
      }
      $("#itemstable tbody").append(row)
    } else {
      $("#itemstable tbody").append("<tr><td colspan='99'>No item found</td></tr>")
    }

    // Install event handlers
    $("#itemstable tbody td[id^=title]").on("dblclick", (ev)=>{
      itemShow($(ev.currentTarget).data("id"))
    })
    $("#itemstable tbody i[id^=remove]").on("click", (ev)=>{
      itemRemove($(ev.currentTarget).data("id"))
    })
    $("#itemstable tbody i[id^=clone]").on("click",(ev)=>{
      itemClone($(ev.currentTarget).data("id"))
    })
    $("#itemstable tbody i[id^=link]").on("click",(ev)=>{
      itemCopyLink($(ev.currentTarget).data("id"))
    })
    $("#itemstable .copytoclipboard").on("click",(ev)=>{
      copyToClipboard(ev)
    })
    $("#itemstable tbody i[id^=passwordcopy").on("click",(ev)=>{
      passwordCopy(ev)
    })
    $("#itemstable tbody i[id^=passwordshow").on("click",(ev)=>{
      passwordShow(ev)
    })

    // Folder cannot be removed if not empty
    if ( $("#itemstable tbody tr").length ) {
      $("#removefolder").attr("disabled","disabled")
    }

    loadingHide($("#itemstable"))
  })
}

function folderClicked(ev, selectonly) {
  $("[role=treeitem]").removeClass("v-treeselected")

  // If ev is a string, the call has been forced on an item just for items reload: calling an
  // "onclick" directly would mess with collapse status of the folder
  if ( typeof ev==="string" ) {
    $("[role=treeitem][id="+ev+"]").addClass("v-treeselected")
    ensureVisibile( $("[role=treeitem][id="+ev+"]") )
    currentFolder = ev
  } else {
    $(this).addClass("v-treeselected")
    currentFolder = this.id
  }

  if ( selectonly ) {
    return
  }

  localStorage.setItem(`bstreeview_open_folderstree_${ getUser() }`,currentFolder)

  // Read folder info
  $.get("/pages/folders/"+currentFolder,(resp)=>{

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

function toggleNewPassword() {
  if ( $("#newpassword").attr("type")=="password") {
    $("#newpassword").attr("type","text")
  } else {
    $("#newpassword").attr("type","password")
  }
}

function itemCreate() {
  let itemdata = {
    _csrf: $("#_csrf").val(),
    title: $("#newtitle").val(),
    email: $("#newemail").val(),
    description: $("#newdescription").val(),
    url: $("#newurl").val(),
    user: $("#newuser").val(),
    password: $("#newpassword").val()
  }

  $.post("/pages/itemnew/"+currentFolder, itemdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    if ( resp.data.id ) {
      location.reload()
    } else {
      errorDialog(resp.message)
    }
  });
}

function itemCreateEnable() {
  if ( $("#newtitle").val()=="" ) {
    $("#itemcreate").attr("disabled","disabled")
  } else {
    $("#itemcreate").removeAttr("disabled")
  }
}

function itemRemove(itm) {
  confirm("Remove item", "Are you sure you want to remove this item?", ()=> {
    $.post("/pages/itemremove/"+itm, {_csrf: $("#_csrf").val()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      location.reload()
    })
  })
}

function itemEditFill(item) {
  $("#itemeditid").val(item)

  $.get("/pages/items/"+item, (resp)=> {
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

    itemEditEnable()
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

  $.post("/pages/itemupdate/"+$("#itemeditid").val(), itemdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
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

function folderCreateEnable() {
  if ( $("#newfolderdescription").val()=="" ) {
    $("#foldercreate").attr("disabled","disabled")
  } else {
    $("#foldercreate").removeAttr("disabled")
  }
}

function folderCreate() {
  let itemdata = {
    _csrf: $("#_csrf").val(),
    description: $("#newfolderdescription").val()
  }

  $.post("/pages/foldernew/"+currentFolder, itemdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function folderRemove() {
  confirm("Remove folder", "Are you sure you want to remove this folder?", ()=> {
    $.post("/pages/folderremove/"+currentFolder, {_csrf: $("#_csrf").val()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      location.reload()
    })
  })
}

function folderEditEnable() {
  if ( $("#foldereditdescription").val()=="" ) {
    $("#folderedit").attr("disabled","disabled")
  } else {
    $("#folderedit").removeAttr("disabled")
  }
}

function folderEditFill() {
  $("#foldereditid").val(currentFolder)

  $.get("/pages/folders/"+currentFolder, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    $("#foldereditdescription").val(resp.data.description)
  })
}

function folderEdit() {
  let data = {
    _csrf: $("#_csrf").val(),
    description: $("#foldereditdescription").val()
  }

  $.post("/pages/folderupdate/"+$("#foldereditid").val(), data, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
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
  $.get("/pages/items/"+item, (resp)=> {
    if ( !checkResponse(resp) ) {
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
  $("#view-"+item).click()
}

$(function() {
  // Reset new item dialog fields
  $("#newitemdialog").on("hidden.bs.modal", ()=> {
    $("#newitemdialog input,textarea").val("")
  })

  // Get the item data to be edited
  $("#edititemdialog").on("show.bs.modal", (ev)=> {
    itemEditFill($(ev.relatedTarget).data("id"))
  })

  // Reset new folder dialog fields
  $("#newfolderdialog").on("hidden.bs.modal", ()=> {
    $("#newfolderdialog input,textarea").val("")
  })

  // Autofocus
  $("#newitemdialog,#edititemdialog,#newfolderdialog").on("shown.bs.modal", (ev)=> {
    $(this).find("[autofocus]").focus()
  })

  // Get the folder data to be edited
  $("#editfolderdialog").on("show.bs.modal", (ev)=> {
    folderEditFill($(ev.relatedTarget).data("id"))
  })

  // Get the item data to be shown
  $("#viewitemdialog").on("show.bs.modal", (ev)=> {
    itemViewFill($(ev.relatedTarget).data("id"))
  })
})

var searchFolderIndex = 0
function searchFolder(start,direction) {
  if ( start===undefined ) {
    searchFolderIndex = 0
  }

  var search = $("#foldersearch").val().toLowerCase()
  var folders = $("span[id^=treedesc]")

  var index = 0
  for ( const folder of folders ) {
    if ( $(folder).html().toLowerCase().includes(search) ) {
      if ( index==searchFolderIndex ) {
        var parents = $(folder).parents()
        for ( const parent of parents ) {
          // Expand parents
          if ( $(parent).attr("role")=="group" && !$(parent).hasClass("show") ) {
            const id = "#" + $(parent).attr("id")
            const el = $(`[data-bs-target='${id}']`)
            $(el).find("i").click()
          }
        }
        folderClicked( ''+$(folder).data("id") )
        return true
      }
      index++
    }
  }
  return false
}

function searchFolderNext() {
  searchFolderIndex++
  if ( !searchFolder(searchFolderIndex, 0) ) {
    searchFolderIndex--
  }
}

function searchFolderPrevious() {
  searchFolderIndex--
  if ( !searchFolder(searchFolderIndex, 1) ) {
    searchFolderIndex++
  }
}

function itemClone(itm) {
  confirm("Clone item", "Do you want to clone this item?", ()=>{
    $.post(`/pages/items/${itm}/clone`, {_csrf: $("#_csrf").val()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      location.reload()
    })
  })
}

function itemCopyLink(itm) {
  navigator.clipboard.writeText(`${window.location.origin}/pages/items?viewitem=${itm}`)
  showToast("Item link copied to clipboard")
}

function findAndShowItem(itm) {
  itemViewFill(itm)
  const dialog = bootstrap.Modal.getOrCreateInstance(document.getElementById("viewitemdialog"), {})
  dialog.show()
}

function personalPasswordCreateDialog() {
  const dialog = bootstrap.Modal.getOrCreateInstance(document.getElementById("personalpasswordnew"), {})
  dialog.show()
}

function personalPasswordAskDialog() {
  const dialog = bootstrap.Modal.getOrCreateInstance(document.getElementById("personalpasswordset"), {})
  dialog.show()
}

function personalPasswordCreateEnable() {
  if (
    $("#newpersonalpassword").val()=="" || $("#newpersonalpassword").val().length<8 || $("#newpersonalpassword").val()!=$("#newpersonalpasswordconfirm").val() ) {
      $("#personalpasswordcreate").attr("disabled","disabled")
  } else {
    $("#personalpasswordcreate").removeAttr("disabled")
  }
}

function togglePersonalPassword() {
  if ( $("#newpersonalpassword").attr("type")=="password") {
    $("#newpersonalpassword").attr("type","text")
  } else {
    $("#newpersonalpassword").attr("type","password")
  }
}

function togglePersonalPasswordConfirm() {
  if ( $("#newpersonalpasswordconfirm").attr("type")=="password") {
    $("#newpersonalpasswordconfirm").attr("type","text")
  } else {
    $("#newpersonalpasswordconfirm").attr("type","password")
  }
}

function togglePersonalPasswordSet() {
  if ( $("#togglepersonalpassword").attr("type")=="password") {
    $("#togglepersonalpassword").attr("type","text")
  } else {
    $("#togglepersonalpassword").attr("type","password")
  }
}

function personalPasswordCreate() {
  let data = {
    _csrf: $("#_csrf").val(),
    password: $("#newpersonalpassword").val()
  }

  $.post("/pages/personalpassword", data, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function personalPasswordSet() {
  let data = {
    _csrf: $("#_csrf").val(),
    password: $("#personalpasswordask").val()
  }

  $.post("/pages/personallogin", data, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function passwordCopy(ev) {
  var item = $(ev.currentTarget).data("id")
  $.get("/pages/items/"+item, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    copyToClipboard(resp.data.data.password)

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
  $.get(`/pages/items/${item}`, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    $(`#password-${item}`).html(resp.data.data.password)

    passwordAccessed(item)
  })
}

function passwordAccessed(item) {
  $.post("/pages/events", {
    _csrf: $("#_csrf").val(),
    event: 'pwdread',
    itemtype: 'item',
    itemid: item
  })
}

$(()=>{
  $.get("/pages/folderstree", (resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    $('#tree').bstreeview({ parentsMarginLeft: '1rem', indent: 1, data: resp.data })
    $('[role=treeitem]').on("click", folderClicked)

    // Open last used folder
    const last = localStorage.getItem(`bstreeview_open_folderstree_${ getUser() }`)
    if ( last ) {
      folderClicked(last)
    }
  })

  // Event handlers
  $("#newfolderdescription").on("keyup",(ev)=>{
    folderCreateEnable()
  })
  $("#foldercreate").on("click",(ev)=>{
    folderCreate()
  })
  $("#foldereditdescription").on("keyup",(ev)=>{
    folderEditEnable()
  })
  $("#folderedit").on("click",(ev)=>{
    folderEdit()
  })
  $("#removefolder").on("click",(ev)=>{
    folderRemove()
  })
  $("#itemcreate").on("click",(ev)=>{
    itemCreate()
  })
  $("#togglenewpassword").on("click",(ev)=>{
    toggleNewPassword()
  })
  $("#newtitle").on("keyup",(ev)=>{
    itemCreateEnable()
  })
  $("#toggleviewpassword").on("click",(ev)=>{
    toggleViewPassword()
  })
  $("#itemedit").on("click",(ev)=>{
    itemEdit()
  })
  $("#toggleeditpassword").on("click",(ev)=>{
    toggleEditPassword()
  })
  $("#togglepersonalpassword").on("click",(ev)=>{
    togglePersonalPasswordSet()
  })
  $("#edittitle").on("keyup",(ev)=>{
    itemEditEnable()
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

  // Autofocus
  $("#personalpasswordset,#personalpasswordnew").on("shown.bs.modal", (ev)=> {
    $(ev.currentTarget).find("[autofocus]").focus()
  })

  $("#newitemdialog").on("shown.bs.modal", (ev)=>{
    itemCreateEnable()
  })

  $("#itemsearch").on("keyup", (ev) => {
    if ( itemSearchTimeout ) {
      clearTimeout(itemSearchTimeout)
    }
    itemSearchTimeout = setTimeout(fillItems,250)
  })

  $("#foldersearch").on("keyup", (ev)=> {
    if ( folderSearchTimeout ) {
      clearTimeout(folderSearchTimeout)
    }
    folderSearchTimeout = setTimeout(searchFolder,250)
  })

  if ( $("#viewitem").length ) {
    findAndShowItem($("#viewitem").val())
  }

  $("#foldersearchnext").on("click", (ev)=>{
    searchFolderNext()
  })

  $("#foldersearchprevious").on("click", (ev)=>{
    searchFolderPrevious()
  })

  $("#copyviewpassword").on("click", (ev)=>{
    passwordAccessed($("#itemviewid").val())
  })

})