function fillGroups() {
  loadingShow($("#groupstable"))

  $("#groupstable tbody tr").remove()

  if ( !currentFolder() ) {
    return
  }

  $.get(`/api/foldergroups/${currentFolder()}`,(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    if ( resp.data.length ) {
      var row = "<tr>"
      for ( const itm of resp.data ) {
        if ( itm.inherited ) {
          row += "<td colspan='2'>Inherited</td>"
        } else {
          if ( itm.canmodify ) {
            row += `<td><sl-icon-button id='removegroup-${itm.id}' data-id='${itm.id}' name='trash3' title='Remove' style='color:red;'></sl-icon-button></td>`
            row += `<td><sl-icon-button id='togglegroup-${itm.id}' data-id='${itm.id}' name='arrow-left-right' title='Change permissions'></sl-icon-button></td>`
          } else {
            row += "<td></td><td></td>"
          }
        }
        row += "<td class='border-start'>"+(itm.write ? "Read + write" : "Read only")+"</td>"
        row += `<td>${itm.description}</td></tr>`

        // Check if groups can be added
        if ( !itm.canmodify ) {
          $("#addgroup").attr("disabled","disabled")
        } else {
          $("#addgroup").removeAttr("disabled")
        }
      }
      $("#groupstable tbody").append(row)

      // Event handlers
      $("[id^=removegroup]").on("click", groupRemove)
      $("[id^=togglegroup]").on("click", groupToggle)
    }
    loadingHide($("#groupstable"))
  })
}

function folderClicked(folderid) {
  $.get(`/api/folders/${folderid}`,(resp)=>{

    // Folder may not be accessible
    if ( !checkResponse(resp,"403") ) {
      return
    }

    if ( resp.data && resp.data.permissions ) {
      currentPermissions = resp.data.permissions
    } else {
      currentPermissions = { read: false, write: false }
    }

    // Load groups
    fillGroups()

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

function groupRemove(ev) {
  const group = $(ev.currentTarget).data("id")
  confirmDialog("Remove group", "Are you sure you want to remove the group?", ()=>{
    $.ajax({
      url: `/api/folders/${currentFolder()}/groups/${group}`,
      type: "delete",
      data: { _csrf: $("#_csrf").val() },
      success: (resp)=>{
        if ( !checkResponse(resp) ) {
          return
        }

        fillGroups()
        showToast("success",  "Group removed")
      }
    })
  })
}

function groupToggle(ev) {
  const group = $(ev.currentTarget).data("id")
  $.post(`/api/folders/${currentFolder()}/groups/${group}/toggle`, { _csrf: $("#_csrf").val() },(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    fillGroups()
    showToast("success",  "Group permissions changed")
  })
}

function groupPickerChoosen(group) {
  $.post(`/api/folders/${currentFolder()}/groups/${group}`, { _csrf: $("#_csrf").val() }, (resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    groupPickerHide()
    fillGroups()
    showToast("success",  "Group added")
  })
}


$(()=>{
  fillFolders()

  document.querySelector("#addgroup").addEventListener("click",(ev)=>{
    groupPickerShow()
  })
})
