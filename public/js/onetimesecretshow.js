import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

JH.event('#show', 'click', async (ev) => {
  const token = JH.query('#token').getAttribute('data-token')
  try {
    const resp = await JH.http(`/noauth/onetimesecretget/${token}`)
    if (!await PW.checkResponse(resp)) {
      throw new Error()
    }

    const body = await resp.json()
    if (body.data?.type === undefined) {
      PW.errorDialog('This token does not exist, or it has been already read')
      throw new Error()
    }
    // Secret
    if (body.data.type === 0) {
      JH.value('#secret', body.data.secret)
      JH.query('#result0').style.visibility = 'visible'
      JH.query('#result0').style.display = 'block'
    }
    // Item
    if (body.data.type === 1) {
      JH.value('#itemtitle', body.data.item.title)
      const data = JSON.parse(body.data.item.data)
      JH.value('#itemdescription', data.description)
      JH.value('#itememail', data.email)
      JH.value('#itemurl', data.url)
      JH.value('#itemuser', data.user)
      JH.value('#itempassword', data.password)
      JH.query('#result1').style.visibility = 'visible'
      JH.query('#result1').style.display = 'block'
    }
    JH.query('#show').style.visibility = 'hidden'
    JH.query('#show').style.display = 'none'
  } catch (err) {
    JH.query('#show').style.visibility = 'hidden'
    JH.query('#result0').style.display = 'none'
    JH.query('#result1').style.display = 'none'
  }
})
