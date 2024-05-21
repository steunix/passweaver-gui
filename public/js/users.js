var userSearchTimeout
var currentUser = ""

function fillUsers() {
  $.get("/api/userslist?search="+$("#usersearch").val(),(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }
    $("#groupstable tbody tr").remove()
    $("#userstable tbody tr").remove()
    if ( resp.data.length ) {
      var row = ""
      for ( const itm of resp.data ) {
        row +=
          `<tr data-id='${itm.id}' style='cursor:pointer'>`+
          `<td><sl-icon-button id='edituser-${itm.id}' title='Edit user' name='pencil' data-id='${itm.id}'></sl-icon-button></td>`+
          `<td><sl-icon-button id='removeuser-${itm.id}' title='Delete user' name='trash3' style='color:red;' data-id='${itm.id}'></sl-icon-button></td>`+
          `<td class='border-start'>${itm.login}</td>`+
          `<td>${itm.lastname}</td>`+
          `<td>${itm.firstname}</td>`+
          `<td>${itm.email}</td>`+
          `<td>${itm.locale}</td>`+
          `<td>${itm.authmethod}</td>`+
          `<td class='text-center'><sl-icon name='${itm.active ? "check-lg":"x-lg"}' style='color:${itm.active?"green":"red"}'/></td>`+
          `</tr>`
      }
      document.querySelector("#userstable tbody").innerHTML = row

      // Install event handlers
      $("#userstable tbody tr").on("dblclick",(ev)=>{
        userDoubleClicked($(ev.currentTarget).data("id"))
      })
      $("#userstable tbody tr [id^=edituser]").on("click",(ev)=>{
        userEditDialog($(ev.currentTarget).data("id"))
      })
      $("#userstable tbody tr [id^=removeuser]").on("click",(ev)=>{
        userRemove($(ev.currentTarget).data("id"))
      })
      $("#userstable tbody tr").on("click",(ev)=>{
        currentUser = $(ev.currentTarget).data("id")
        $(ev.currentTarget).addClass("rowselected").siblings().removeClass("rowselected")
        fillGroups()
      })
    }
  })
}

function fillGroups() {
  loadingShow($("#groupstable"))

  $("#groupstable tbody tr").remove()
  $.get("/api/usergroups/"+currentUser,(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    if ( resp.data.length ) {
      var row = "<tr>"
      for ( const itm of resp.data ) {
        row += `<td><sl-icon-button id='removegroup-${itm.id}' data-id='${itm.id}' name='trash3' style='color:red;' title='Remove'></sl-icon-button></td>`
        row += `<td>${itm.description}</td></tr>`
      }
      $("#groupstable tbody").append(row)

      // Event handlers
      $("[id^=removegroup]").on("click", groupRemove)
    }
    loadingHide($("#groupstable"))
  })
}

function userCreateDialog() {
  document.querySelector("#newuserdialog").show()
  $("#newuserdialog sl-input,sl-textarea,sl-select").val("")
  userCreateEnable()
}

function userCreate() {
  let userdata = {
    _csrf: $("#_csrf").val(),
    login: $("#newlogin").val(),
    email: $("#newemail").val(),
    lastname: $("#newlastname").val(),
    firstname: $("#newfirstname").val(),
    locale: $("#newlocale").val(),
    authmethod: $("#newauthmethod").val(),
    active: $("#newactive").attr("checked"),
    secret: $("#newpassword").val()
  }

  $.post("/api/usernew/", userdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    fillUsers()
    document.querySelector("#newuserdialog").hide()
    showToast("success", "User created")
  })
}

function userCreateEnable() {
  if (
    $("#newlogin").val()=="" || $("#newemail").val()=="" || $("#newlastname").val()=="" ||
    $("#newpassword").val()!=$("#newpasswordconfirm").val() || $("#newpassword").val()=="" ) {
      $("#usercreate").attr("disabled","disabled")
  } else {
    $("#usercreate").removeAttr("disabled")
  }
}

function userRemove(usr) {
  confirmDialog("Remove user", "<strong><span style='color:red;'>Are you sure you want to delete this user? Also his personal folder and contained items will be deleted!</span></strong>", ()=> {
    $.post("/api/userremove/"+usr, {_csrf: $("#_csrf").val()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      fillUsers()
      showToast("success", "User removed")
    })
  })
}

function userEditFill(user) {
  $.get("/api/users/"+user, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    $("#editlogin").val(resp.data.login)
    $("#editemail").val(resp.data.email)
    $("#editlastname").val(resp.data.lastname)
    $("#editfirstname").val(resp.data.firstname)
    $("#editlocale").val(resp.data.locale)
    $("#editauthmethod").val(resp.data.authmethod)
    if ( !resp.data.active ) {
      $("#editactive").removeAttr("checked")
    } else {
      $("#editactive").attr("checked","checked")
    }

    userEditEnable()
  })
}

function userEditEnable() {
  if ( $("#editlogin").val()=="" || $("#editemail").val()=="" || $("#editlastname").val()=="" ) {
      $("#useredit").attr("disabled","disabled")
  } else {
    $("#useredit").removeAttr("disabled")
  }
}

function userEditDialog(userid) {
  const dialog = $("#edituserdialog")
  userEditFill(userid)
  dialog[0].show()
}

function userEdit() {
  let userdata = {
    _csrf: $("#_csrf").val(),
    login: $("#editlogin").val(),
    email: $("#editemail").val(),
    lastname: $("#editlastname").val(),
    firstname: $("#editfirstname").val(),
    locale: $("#editlocale").val(),
    authmethod: $("#editauthmethod").val(),
    active: $("#editactive").prop("checked")
  }

  $.post(`/api/userupdate/${currentUser}`, userdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    fillUsers()
    showToast("success", "User saved")
  })
}

function userDoubleClicked(user) {
  if ( window.getSelection() ) {
    window.getSelection().empty()
  }
  $("#edituser-"+user).click()
}

$(function() {

})

function groupRemove(ev) {
  const group = $(ev.currentTarget).data("id")
  confirmDialog("Remove user from group", "Are you sure you want to remove the user from the group?", ()=> {
    $.post(`/api/groupremoveuser/${group}/${currentUser}`, {_csrf: $("#_csrf").val()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      fillGroups()
      showToast("success", "Group removed")
    })
  })
}

function groupPickerChoosen(group) {
  groupPickerHide()
  $.post(`/api/groupadduser/${group}/${currentUser}`, {_csrf: $("#_csrf").val()}, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    fillGroups()
    showToast("success","Group added")
  })
}

$(()=>{
  fillUsers()

  // Event handlers
  $("#newlogin,#newemail,#newlastname,#newpassword,#newpasswordconfirm").on("keyup",(ev)=>{
    userCreateEnable()
  })
  $("#usercreate").on("click",(ev)=> {
    userCreate()
  })
  $("#editlogin,#editemail,#editlastname").on("keyup",(ev)=>{
    userEditEnable()
  })
  $("#useredit").on("click",(ev)=>{
    userEdit()
  })
  $("#newuser").on("click",(ev)=>{
    userCreateDialog()
  })
  $("#newuserdialog #cancel").on("click", (ev)=>{
    document.querySelector("#newuserdialog").hide()
  })
  $("#usersearch").on("sl-input", (ev) => {
    if ( userSearchTimeout ) {
      clearTimeout(userSearchTimeout)
    }
    userSearchTimeout = setTimeout(()=>{
      $("#groupstable tbody tr").remove()
      fillUsers()
    },250)
  })
  $("#addgroup").on("click",(ev)=>{
    if ( currentUser==="" ) {
      errorDialog("Select a user")
      return
    }
    groupPickerShow()
  })
})