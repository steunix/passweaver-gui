var currentFolder = ""
var folderSearchTimeout

function fillGroups() {
  loadingShow($("#groupstable"))

  $("#groupstable tbody tr").remove()
  $.get("/pages/foldergroups/"+currentFolder,(resp)=>{
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
            row += `<td><i id='removegroup-${itm.id}' data-id='${itm.id}' class='fa-solid fa-trash text-danger' title='Remove'></i></td>`
            row += `<td><i id='togglegroup-${itm.id}' data-id='${itm.id}' class='fa-solid fa-arrow-right-arrow-left' title='Change permission'></i></td>`
          } else {
            row += "<td></td><td></td>"
          }
        }
        row += "<td>"+(itm.write ? "Read + write" : "Read only")+"</td>"
        row += "<td>"+itm.description+"</td></tr>"

        // Check if groups can be added
        if ( !itm.canmodify ) {
          $("#addgroup").attr("disabled","disabled")
        } else {
          $("#addgroup").removeAttr("disabled")
        }
      }
      $("#groupstable tbody").append(row)

      // Event handlers
      $("i[id^=removegroup]").on("click", groupRemove)
      $("i[id^=togglegroup]").on("click", groupToggle)
    }
    loadingHide($("#groupstable"))
  })
}

function folderClicked(ev) {
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

  localStorage.setItem("bstreeview_open_folderstree",currentFolder)

  // Load groups
  fillGroups()
}

function groupRemove(ev) {
  const group = $(ev.currentTarget).data("id")
  confirm("Remove group", "Are you sure you want to remove the group?", ()=>{
    $.ajax({
      url: `/pages/folders/${currentFolder}/groups/${group}`,
      type: "delete",
      data: { _csrf: $("#_csrf").val() },
      success: (resp)=>{
        if ( !checkResponse(resp) ) {
          return
        }

        location.reload()
      }
    })
  })
}

function groupToggle(ev) {
  const group = $(ev.currentTarget).data("id")
  $.post(`/pages/folders/${currentFolder}/groups/${group}/toggle`, { _csrf: $("#_csrf").val() },(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function groupPickerChoosen(group) {
  $.post(`/pages/folders/${currentFolder}/groups/${group}`, { _csrf: $("#_csrf").val() }, (resp)=>{
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

$(()=>{
  $.get("/pages/folderstree", (resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    $('#tree').bstreeview({ parentsMarginLeft: '1rem', indent: 1, data: resp.data })
    $('[role=treeitem]').on("click", folderClicked)

    // Open last used folder
    const last = localStorage.getItem("bstreeview_open_folderstree")
    if ( last ) {
      folderClicked(last)
    }
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

  // Autofocus
  $("#grouppicker").on("shown.bs.modal", (ev)=> {
    $(ev.currentTarget).find("[autofocus]").focus()
  })
})
