var groupSearchTimeout

function currentGroup() {
  try {
    return document.querySelector("sl-tree-item[selected]").getAttribute("data-id")
  } catch (err) {
    return ""
  }
}

function fillUsers() {
  loadingShow($("#userstable"))

  $("#userstable tbody tr").remove()
  $.get(`/api/userslist/${currentGroup()}`,(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    if ( resp.data.length ) {
      var row = ''
      for ( const usr of resp.data ) {
        row +=
          `<tr>`+
          `<td><sl-icon-button id='remove-${usr.id}' title='Remove' data-id='${usr.id}' name="trash3" style="color:red;"></sl-icon-button></td>`+
          `<td class='border-start'>${usr.login}</td>`+
          `<td>${usr.lastname}</td>`+
          `<td>${usr.firstname}</td>`
      }

      // Install event handlers
      $("#userstable tbody [id^=remove]").on("click",(ev)=>{
        groupRemoveUser($(ev.currentTarget).data("id"))
      })
      document.querySelector("#userstable tbody").innerHTML = row
    }

    // Group cannot be removed if not empty
    if ( $("#userstable tbody tr").length ) {
      $("#removegroup").attr("disabled","disabled")
    } else {
      $("#removegroup").removeAttr("disabled")
    }

    loadingHide($("#userstable"))
  })
}

function groupClicked(groupid) {
  fillUsers()
}

function groupCreateEnable() {
  if ( $("#groupcreatedescription").val()==="" ) {
    $("#groupcreatesave").attr("disabled","disabled")
  } else {
    $("#groupcreatesave").removeAttr("disabled")
  }
}

function groupCreateDialog() {
  const dialog = $("#groupcreatedialog")
  $("#groupcreatedialog sl-input,sl-textarea").val("")
  groupCreateEnable()
  dialog[0].show()
}

function groupCreate() {
  let userdata = {
    _csrf: $("#_csrf").val(),
    description: $("#groupcreatedescription").val()
  }

  $.post(`/api/groupnew/${currentGroup()}`, userdata, (resp)=> {
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

function groupRemove() {
  confirmDialog("Remove group", "Are you sure you want to remove this group?", ()=> {
    $.post(`/api/groupremove/${currentGroup()}`, {_csrf: $("#_csrf").val()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      location.reload()
    })
  })
}

function groupEditDialog() {
  const dialog = document.querySelector("#groupeditdialog")
  groupEditFill()
  dialog.show()
}

function groupEditFill() {
  $.get(`/api/groups/${currentGroup()}`, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    if ( resp.status=="success" ) {
      $("#groupeditdescription").val(resp.data.description)
      groupEditEnable()
    }
  })
}

function groupEdit() {
  let data = {
    _csrf: $("#_csrf").val(),
    description: $("#groupeditdescription").val()
  }

  $.post(`/api/groupupdate/${currentGroup()}`, data, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function groupEditEnable() {
  if ( $("#groupeditdescription").val()=="" ) {
    $("#groupeditsave").attr("disabled","disabled")
  } else {
    $("#groupeditsave").removeAttr("disabled")
  }
}

function userPickerChoosen(id) {
  $.post(`/api/groupadduser/${currentGroup()}/${id}`, {_csrf: $("#_csrf").val()}, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    userPickerHide()
    fillUsers()
  })
}

function groupRemoveUser(id) {
  confirmDialog("Remove user from group", "Are you sure you want to remove the user from the group?", ()=> {
    $.post(`/api/groupremoveuser/${currentGroup()}/${id}`, {_csrf: $("#_csrf").val()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      fillUsers()
    })
  })
}

$.get("/api/groupstree", (resp)=>{
  if ( !checkResponse(resp) ) {
    return
  }

  treeFill("groupstree",resp.data,null,groupClicked)
})

// Event handlers
$("#groupremove").on("click", (ev)=>{
  groupRemove()
})
$("#groupedit").on("click", (ev)=>{
  groupEditDialog()
})
$("#groupcreate").on("click", (ev)=>{
  groupCreateDialog()
})

$("#groupcreatedescription").on("keyup", (ev)=>{
  groupCreateEnable()
})
$("#groupcreatesave").on("click", (ev)=>{
  groupCreate()
})
$("#groupcreatecancel").on("click", (ev)=> {
  const dialog = $("#groupcreatedialog")
  dialog[0].hide()
})

$("#groupeditdescription").on("keyup", (ev)=>{
  groupEditEnable()
})
$("#groupeditsave").on("click", (ev)=>{
  groupEdit()
})
$("#groupeditcancel").on("click", (ev)=> {
  const dialog = $("#groupeditdialog")
  dialog[0].hide()
})

$("#newmember").on("click", (ev)=>{
  if ( currentGroup()=="" ) {
    errorDialog("Select a group")
    return
  }
  userPickerShow()
})

$("#groupsearch").on("sl-input", (ev)=> {
  if ( groupSearchTimeout ) {
    clearTimeout(groupSearchTimeout)
  }
  groupSearchTimeout = setTimeout(()=>{
    const search = document.querySelector("#groupsearch").value
    if ( !treeSearch("groupstree", search) ) {
      showToast("danger", "Not found")
    }
  },250)
})
$("#groupsearchnext").on("click", (ev)=>{
  const search = document.querySelector("#groupsearch").value
  treeSearchNext("groupstree", search)
})

$("#groupsearchprevious").on("click", (ev)=>{
  const search = document.querySelector("#groupsearch").value
  treeSearchPrevious("groupstree", search)
})