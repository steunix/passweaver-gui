var currentFolder = ""

function fillGroups() {
  loadingShow($("#groupstable"))
  $.get("/pages/foldergroups/"+currentFolder,(resp)=>{
    $("#groupstable tbody tr").remove()
    if ( resp.data.length ) {
      for ( const itm of resp.data ) {
        var row = "<tr>"
        if ( itm.inherited ) {
          row += "<td>Inherited</td>"
        } else {
          if ( itm.canmodify ) {
            row += `<td><i class='fa-solid fa-trash text-danger' onclick='javascript:groupRemove("${itm.id}")'></i></td>`
          } else {
            row += "<td></td>"
          }
        }
        row += "<td>"+(itm.write ? "Read + write" : "Read only")+"</td>"
        row += "<td>"+itm.description+"</td></tr>"
        $("#groupstable tbody").append(row)

        // Check if groups can be added
        if ( !itm.canmodify ) {
          $("#addgroup").attr("disabled","disabled")
        } else {
          $("#addgroup").removeAttr("disabled")
        }
      }
    }
    loadingHide($("#groupstable"))
  })
}

function folderClicked(ev) {
  $("[role=treeitem]").css({"font-weight":"normal","background-color":"transparent"})

  // If ev is a string, the call has been forced on an item just for items reload: calling an
  // "onclick" directly would mess with collapse status of the folder
  if ( typeof ev==="string" ) {
    $("[role=treeitem][id="+ev+"]").css("font-weight","bold").css("background-color","#eeeeee")
    ensureVisibile( $("[role=treeitem][id="+ev+"]") )
    currentFolder = ev
  } else {
    $(this).css("font-weight","bold").css("background-color","#eeeeee")
    currentFolder = this.id
  }

  localStorage.setItem("bstreeview_open_folderstree",currentFolder)

  // Load groups
  fillGroups()
}
