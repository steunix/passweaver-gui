var folderSearchTimeout

var currentPermissions = {
  read: false,
  write: false
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

  $.post("/api/foldernew/"+currentFolder, itemdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function folderRemove() {
  confirm("Remove folder", "Are you sure you want to remove this folder?", ()=> {
    $.post("/api/folderremove/"+currentFolder, {_csrf: $("#_csrf").val()}, (resp)=> {
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

  $.get("/api/folders/"+currentFolder, (resp)=> {
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

  $.post("/api/folderupdate/"+$("#foldereditid").val(), data, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

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

$(function() {
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

  $("#foldersearch").on("keyup", (ev)=> {
    if ( folderSearchTimeout ) {
      clearTimeout(folderSearchTimeout)
    }
    folderSearchTimeout = setTimeout(searchFolder,250)
  })

  $("#foldersearchnext").on("click", (ev)=>{
    searchFolderNext()
  })

  $("#foldersearchprevious").on("click", (ev)=>{
    searchFolderPrevious()
  })

  // Reset new folder dialog fields
  $("#newfolderdialog").on("hidden.bs.modal", ()=> {
    $("#newfolderdialog input,textarea").val("")
  })

  // Autofocus
  $("#newfolderdialog").on("shown.bs.modal", (ev)=> {
    $(this).find("[autofocus]").focus()
  })

  // Get the folder data to be edited
  $("#editfolderdialog").on("show.bs.modal", (ev)=> {
    folderEditFill($(ev.relatedTarget).data("id"))
  })
})