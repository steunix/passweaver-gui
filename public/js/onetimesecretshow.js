import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

JH.event('#show', 'click', async (ev) => {
  const token = JH.query('#data').getAttribute('data-token')
  try {
    const resp = await JH.http(`/noauth/onetimesecretget/${token}`)
    const body = await resp.json()
    if (typeof (body.data) !== 'string' || body.data.length < 1) {
      throw new Error('Not found')
    }
    JH.value('#data', body.data)
  } catch (err) {
    PW.errorDialog('This secret does not exist, or it may have already been read. Please check the link.')
    JH.query('#show').style.visibility = 'hidden'
    JH.query('#result').style.visibility = 'hidden'
    return
  }
  JH.query('#show').style.visibility = 'hidden'
  JH.query('#result').style.visibility = 'visible'
})
