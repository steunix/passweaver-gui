var groupSearchTimeout

function currentGroup() {
  try {
    return document.querySelector("sl-tree-item[selected]").getAttribute("data-id")
  } catch (err) {
    return ""
  }
}

function fillUsers() {
  jshQS("#userstable tbody").innerHTML = ""

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
      document.querySelector("#userstable tbody").innerHTML = row

      // Install event handlers
      jshAddEventListener("#userstable tbody [id^=remove]", "click", (ev)=>{
        groupRemoveUser(ev.currentTarget.getAttribute("data-id"))
      })
    }

    // Group cannot be removed if not empty
    if ( jshQSA("#userstable tbody tr").length ) {
      jshQS("#groupremove").setAttribute("disabled","disabled")
    } else {
      jshQS("#groupremove").removeAttribute("disabled")
    }
  })
}

function groupClicked(groupid) {
  fillUsers()
}

function groupCreateEnable() {
  if ( jshValue("#groupcreatedescription")==="" ) {
    jshQS("#groupcreatesave").setAttribute("disabled","disabled")
  } else {
    jshQS("#groupcreatesave").removeAttribute("disabled")
  }
}

function groupCreateDialog() {
  jshValue("#groupcreatedialog sl-input,sl-textarea", "")
  groupCreateEnable()
  jshQS("#groupcreatedialog").show()
}

function groupCreate() {
  let userdata = {
    _csrf: getCSRFToken(),
    description: jshValue("#groupcreatedescription")
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
    $.post(`/api/groupremove/${currentGroup()}`, {_csrf: getCSRFToken()}, (resp)=> {
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
      jshValue("#groupeditdescription", resp.data.description)
      groupEditEnable()
    }
  })
}

function groupEdit() {
  let data = {
    _csrf: getCSRFToken(),
    description: jshValue("#groupeditdescription")
  }

  $.post(`/api/groupupdate/${currentGroup()}`, data, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function groupEditEnable() {
  if ( jshValue("#groupeditdescription")=="" ) {
    jshQS("#groupeditsave").setAttribute("disabled","disabled")
  } else {
    jshQS("#groupeditsave").removeAttribute("disabled")
  }
}

function userPickerChoosen(id) {
  $.post(`/api/groupadduser/${currentGroup()}/${id}`, {_csrf: getCSRFToken()}, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    userPickerHide()
    fillUsers()
  })
}

function groupRemoveUser(id) {
  confirmDialog("Remove user from group", "Are you sure you want to remove the user from the group?", ()=> {
    $.post(`/api/groupremoveuser/${currentGroup()}/${id}`, {_csrf: getCSRFToken()}, (resp)=> {
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
jshAddEventListener("#groupremove", "click", (ev)=>{
  groupRemove()
})
jshAddEventListener("#groupedit", "click", (ev)=>{
  groupEditDialog()
})
jshAddEventListener("#groupcreate", "click", (ev)=>{
  groupCreateDialog()
})

jshAddEventListener("#groupcreatedescription", "keyup", (ev)=>{
  groupCreateEnable()
})
jshAddEventListener("#groupcreatesave", "click", (ev)=>{
  groupCreate()
})
jshAddEventListener("#groupcreatecancel", "click", (ev)=> {
  jshQS("#groupcreatedialog").hide()
})

jshAddEventListener("#groupeditdescription", "keyup", (ev)=>{
  groupEditEnable()
})
jshAddEventListener("#groupeditsave", "click", (ev)=>{
  groupEdit()
})
jshAddEventListener("#groupeditcancel", "click", (ev)=> {
  jshQS("#groupeditdialog").hide()
})

jshAddEventListener("#newmember", "click", (ev)=>{
  if ( currentGroup()=="" ) {
    errorDialog("Select a group")
    return
  }
  userPickerShow()
})

jshAddEventListener("#groupsearch", "sl-input", (ev)=> {
  if ( groupSearchTimeout ) {
    clearTimeout(groupSearchTimeout)
  }
  groupSearchTimeout = setTimeout(()=>{
    const search = jshValue("#groupsearch")
    if ( !treeSearch("groupstree", search) ) {
      showToast("danger", "Not found")
    }
  },250)
})
jshAddEventListener("#groupsearchnext", "click", (ev)=>{
  const search = jshValue("#groupsearch")
  treeSearchNext("groupstree", search)
})

jshAddEventListener("#groupsearchprevious", "click", (ev)=>{
  const search = jshValue("#groupsearch")
  treeSearchPrevious("groupstree", search)
})