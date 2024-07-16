/**
 * PassWeaver-GUI, a GUI for PassWeaver-API password manager
 *
 * (c) 2023 - Stefano Rivoir <rs4000@gmail.com>
 *
 * @module main
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import Express from 'express'
import compression from 'compression'
import helmet from 'helmet'
import https from 'https'
import FS from 'fs'
import Morgan from "morgan"
import * as RFS from "rotating-file-stream"
import favicon from 'serve-favicon'

import * as Config from './src/config.mjs'
import * as PassWeaver from './src/passweaver.mjs'
import session from 'express-session'
import jsonwebtoken from 'jsonwebtoken'
import rateLimitMiddleware from "./src/ratelimiter.mjs"
import lusca from 'lusca'

export const app = Express()

const cfg = Config.get()

// Express middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
      "connect-src": ["'self'","cdn.jsdelivr.net", "data: blob:"],
      "img-src": ["'self'", "https: data: blob:"]
    }
  }
}))

if ( cfg?.https?.hsts ) {
  app.use(helmet.hsts())
}

app.use(Express.json())
app.use(compression())
app.use(Express.urlencoded({ extended: true }))

// Session middleware
app.use(session({
  name: "passweavergui",
  secret: cfg.session_key,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: cfg.https.enabled, maxAge: 1000 * 60 * 60 * 4 }
}))

// CSRF protection
app.use(lusca.csrf({
  key: "_csrf",
  secret: cfg.csrf_key
}))

// Favicon
app.use(
  favicon('./public/images/favicon.ico')
)

// Checks for valid session in pages/ subdir. We can use redirect since they are not Ajax
app.use("/pages", function(req,res,next) {
  if ( req?.session?.user===undefined ) {
    var link = "/login?error="+encodeURIComponent("You need to login")
    if ( req.query?.viewitem ) {
      link += "&viewitem="+encodeURIComponent(req.query.viewitem)
    }
    res.redirect(link)
    return
  }
  return next()
})

// Checks for valid session in api/ subdir. We cant handle redirect()
app.use("/api", function(req,res,next) {
  if ( req?.session?.user===undefined ) {
    res.json({
      status: "failed",
      httpStatusCode: "401",
      fatal: true,
      message: "You need to login",
      data: {}
    })
    return
  }
  return next()
})

// Use EJS
app.set('view engine', 'ejs');

// Static Middleware
app.use("/public", Express.static('public'))

// Rate limiter
app.use("/access", rateLimitMiddleware)

if ( !FS.existsSync(cfg.log_dir) ) {
  FS.mkdirSync(cfg.log_dir)
}

// Log requests
const logAccess = RFS.createStream(`${cfg.log_dir}/passweaver-gui-access.log`, {
  interval: "1d",
  rotate: 14
})
app.use(
  Morgan(`:remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :total-time[0]`,
  { stream: logAccess })
)

// Log errors
const logErrors = RFS.createStream(`${cfg.log_dir}/passweaver-gui-errors.log`, {
  interval: "1d",
  rotate: 14
})

// Common parameters to pass to pages
function commonParams(req) {
  return {
    csrftoken: req.csrfToken(),
    company_name: cfg.company_name,
    user: req.session.user,
    userdescription: req.session.userdescription,
    admin: req.session.admin,
    viewitem: req.query?.viewitem ?? '',
    theme: req?.session?.theme ?? "light",
    version: Config.packageJson().version
  }
}

/**
 * Pages
 */

// Login page
app.get(["/login","/"], (req,res)=>{
  req.locals = {
    error: req.query.error
  }
  res.render('login', { ...req.locals, ...commonParams(req) } )
})

// Logout page
app.get("/logout", (req,res)=>{
  req.session.destroy()
  if ( req.query?.error ) {
    res.redirect("/login?error="+encodeURIComponent(req.query.error))
  } else {
    res.redirect("/login")
  }
})

// Access page
app.post("/access", async (req,res)=>{
  const resp = await PassWeaver.login(req.body.username, req.body.password)

  if ( resp.status!=="success" ) {
    var link = "/login?error="+encodeURIComponent(resp.message)
    if ( req.body?.viewitem ) {
      link += "&viewitem="+encodeURIComponent(req.body.viewitem)
    }
    res.redirect(link)
    return
  }

  // Get user name
  req.session.jwt = resp.data.jwt
  const jwt = jsonwebtoken.decode(req.session.jwt)

  req.session.user = jwt.user
  req.session.admin = jwt.admin

  const usr = await PassWeaver.getUser(req.session, req.session.user)

  req.session.userdescription = (`${usr.data.firstname} ${usr.data.lastname}`).trim()
  req.session.email = usr.data.email

  // Get user preferences
  const prefs = await PassWeaver.preferencesGet(req, req.session)
  const theme = prefs.data.find((el)=>{return el.setting=="theme"})
  if ( theme ) {
    req.session.theme = theme.value
  } else {
    req.session.theme = "light"
  }

  req.session.save()

  if ( req.session.admin ) {
    res.redirect("/pages/folders")
  } else {
    if ( req.body?.viewitem ) {
      res.redirect("/pages/items?viewitem="+encodeURIComponent(req.body.viewitem))
    } else {
      res.redirect("/pages/items")
    }
  }
})

// Items
app.get("/pages/items", async (req,res)=>{
  req.locals = {
    pagetitle: "Items",
    pageid: "items"
  }
  res.render('items', { ...req.locals, ...commonParams(req)} )
})

// Groups
app.get("/pages/groups", async (req,res)=>{
  var page = {
    pagetitle: "Groups",
    pageid: "groups"
  }
  res.render('groups', { ...page, ...commonParams(req) })
})

// Users page
app.get("/pages/users", async(req,res)=> {
  var page = {
    pagetitle: "Users",
    pageid: "users"
  }
  res.render('users', { ...page, ...commonParams(req) })
})

// Folders
app.get("/pages/folders", async (req,res)=>{
  req.locals = {
    pagetitle: "Folders permissions",
    pageid: "folders"
  }
  res.render('folders', { ...req.locals, ...commonParams(req) })
})

// Search items
app.get("/pages/search", async (req,res)=>{
  req.locals = {
    pagetitle: "Search items",
    pageid: "search"
  }
  res.render('search', { ...req.locals, ...commonParams(req) })
})

// Generate password
app.get("/pages/generate", async (req,res)=>{
  req.locals = {
    pagetitle: "Password generator",
    pageid: "generate"
  }
  res.render('generate', { ...req.locals, ...commonParams(req) })
})

// Info
app.get("/pages/info", async(req,res)=> {
  var page = {
    pagetitle: "Info",
    pageid: "info"
  }

  const resp = await PassWeaver.info(req.session)

  page.guiVersion = Config.packageJson().version
  page.guiStartup = Config.get().startuptime
  page.apiVersion = resp.data.version
  page.apiStartup = resp.data.startup
  page.users = resp.data.users
  page.folders = resp.data.folders
  page.items = resp.data.items
  page.cacheSize = resp.data.cacheSize ?? 0

  res.render('info', { ...page, ...commonParams(req) })
})

// Settings
app.get("/pages/settings", async (req,res)=>{
  req.locals = {
    pagetitle: "Settings",
    pageid: "settings"
  }
  res.render('settings', { ...req.locals, ...commonParams(req) })
})

// Preferences
app.get("/pages/preferences", async (req,res)=>{
  req.locals = {
    pagetitle: "Preferences",
    pageid: "preferences"
  }
  res.render('preferences', { ...req.locals, ...commonParams(req) })
})

// One time secret create
app.get("/pages/onetimesecret", async (req,res)=>{
  req.locals = {
    pagetitle: "One time secret",
    pageid: "onetimesecret"
  }
  res.render('onetimesecret', { ...req.locals, ...commonParams(req) })
})

// One time secret display
app.get("/onetimesecret/:token", async(req,res)=> {
  req.locals = {
    pagetitle: "One time secret",
    pageid: "onetimesecretshow",
    token: encodeURIComponent(req.params.token)
  }
  res.render('onetimesecretshow', { ...req.locals, ...commonParams(req) })
})

/**
 * API
 */

// Items list
app.get("/api/itemslist/:folder", async (req,res)=>{
  const list = await PassWeaver.itemsList(req.session, req.params.folder, req.query?.search, req.query?.type)
  res.status(200).json(list)
})

// Items search
app.get("/api/itemssearch/", async (req,res)=>{
  const list = await PassWeaver.itemsSearch(req.session, req.query?.search)
  res.status(200).json(list)
})

// Folder details
app.get("/api/folders/:folder", async (req,res)=>{
  const info = await PassWeaver.getFolder(req.session, req.params.folder)
  res.status(200).json(info)
})

// Get item
app.get("/api/items/:item", async (req,res)=> {
  const resp = await PassWeaver.itemGet(req.session, req.params.item, req.body)
  res.status(200).json(resp)
})

// Create item
app.post("/api/itemnew/:folder", async (req,res)=> {
  const resp = await PassWeaver.itemCreate(req.session, req.params.folder, req.body)
  res.status(200).json(resp)
})

// Delete item
app.post("/api/itemremove/:item", async (req,res)=> {
  const resp = await PassWeaver.itemRemove(req.session, req.params.item, req.body)
  res.status(200).json(resp)
})

// Update item
app.post("/api/itemupdate/:item", async (req,res)=> {
  const resp = await PassWeaver.itemUpdate(req.session, req.params.item, req.body)
  res.status(200).json(resp)
})

// Move item
app.post("/api/itemmove/:item", async (req,res)=> {
  const resp = await PassWeaver.itemMove(req.session, req.params.item, req.body)
  res.status(200).json(resp)
})

// Clone item
app.post("/api/items/:item/clone", async (req,res)=> {
  const resp = await PassWeaver.itemClone(req.session, req.params.item)
  res.status(200).json(resp)
})

// Get folders tree
app.get("/api/folderstree", async (req,res)=> {
  const resp = await PassWeaver.foldersTree(req.session)
  res.status(200).json(resp)
})

// Create folder
app.post("/api/foldernew/:folder", async (req,res)=> {
  const resp = await PassWeaver.folderCreate(req.session, req.params.folder, req.body)
  res.status(200).json(resp)
})

// Delete folder
app.post("/api/folderremove/:folder", async (req,res)=> {
  const resp = await PassWeaver.folderRemove(req.session, req.params.folder, req.body)
  res.status(200).json(resp)
})

// Update folder
app.post("/api/folderupdate/:folder", async (req,res)=> {
  const resp = await PassWeaver.folderUpdate(req.session, req.params.folder, req.body)
  res.status(200).json(resp)
})

// Get groups tree
app.get("/api/groupstree", async (req,res)=> {
  const resp = await PassWeaver.groupsTree(req.session)
  res.status(200).json(resp)
})

// Group members list
app.get("/api/userslist/:group", async (req,res)=>{
  const list = await PassWeaver.usersList(req.session, req.params.group)
  res.status(200).json(list)
})

// Create group
app.post("/api/groupnew/:group", async (req,res)=> {
  const resp = await PassWeaver.groupCreate(req.session, req.params.group, req.body)
  res.status(200).json(resp)
})

// Group details
app.get("/api/groups/:group", async (req,res)=>{
  const info = await PassWeaver.getGroup(req.session, req.params.group)
  res.status(200).json(info)
})

// Update group
app.post("/api/groupupdate/:group", async (req,res)=> {
  const resp = await PassWeaver.groupUpdate(req.session, req.params.group, req.body)
  res.status(200).json(resp)
})

// Delete group
app.post("/api/groupremove/:group", async (req,res)=> {
  const resp = await PassWeaver.groupRemove(req.session, req.params.group)
  res.status(200).json(resp)
})

// Add user to group
app.post("/api/groupadduser/:group/:user", async (req,res)=> {
  const resp = await PassWeaver.groupAddUser(req.session, req.params.group, req.params.user)
  res.status(200).json(resp)
})

// Remove user from group
app.post("/api/groupremoveuser/:group/:user", async (req,res)=> {
  const resp = await PassWeaver.groupRemoveUser(req.session, req.params.group, req.params.user)
  res.status(200).json(resp)
})

// Get users list
app.get("/api/userslist", async (req,res)=> {
  const list = await PassWeaver.usersList(req.session,null,req.query?.search)
  res.status(200).json(list)
})

// Create user
app.post("/api/usernew", async (req,res)=> {
  const resp = await PassWeaver.userCreate(req.session, req.body);
  res.status(200).json(resp)
})

// Get user
app.get("/api/users/:item", async (req,res)=> {
  const resp = await PassWeaver.userGet(req.session, req.params.item)
  res.status(200).json(resp)
})

// Update user
app.post("/api/userupdate/:item", async (req,res)=> {
  const resp = await PassWeaver.userUpdate(req.session, req.params.item, req.body)
  res.status(200).json(resp)
})

// Delete user
app.post("/api/userremove/:user", async (req,res)=> {
  const resp = await PassWeaver.userRemove(req.session, req.params.user)
  res.status(200).json(resp)
})

// Get user's groups
app.get("/api/usergroups/:id", async (req,res)=> {
  const resp = await PassWeaver.userGroups(req.session, req.params.id)
  res.status(200).json(resp)
})

// Generate random password
app.get("/api/generatepassword", async(req,res)=> {
  const resp = await PassWeaver.generatePassword(req.session)
  res.status(200).json(resp)
})

// Get folder's groups
app.get("/api/foldergroups/:id", async (req,res)=> {
  const resp = await PassWeaver.folderGroups(req.session, req.params.id)
  res.status(200).json(resp)
})

// Get groups list
app.get("/api/groupslist", async (req,res)=> {
  const list = await PassWeaver.groupsList(req.session,req.query?.search)
  res.status(200).json(list)
})

// Add group to folder
app.post("/api/folders/:folder/groups/:group", async(req,res)=> {
  const resp = await PassWeaver.folderAddGroup(req.session, req.params.folder, req.params.group)
  res.status(200).json(resp)
})

// Remove group from folder
app.delete("/api/folders/:folder/groups/:group", async(req,res)=> {
  const resp = await PassWeaver.folderRemoveGroup(req.session, req.params.folder, req.params.group)
  res.status(200).json(resp)
})

// Toggle group permissions on folder
app.post("/api/folders/:folder/groups/:group/toggle", async(req,res)=> {
  const resp = await PassWeaver.folderToggleGroup(req.session, req.params.folder, req.params.group)
  res.status(200).json(resp)
})

// Generate password
app.get("/api/generate", async (req,res)=>{
  const resp = await PassWeaver.generatePassword()
  res.status(200).json(resp)
})

// Create personal password
app.post("/api/personalpassword", async (req,res)=>{
  const resp = await PassWeaver.personalPasswordCreate(req.session, req.body.password)
  res.status(200).json(resp)
})

// Set personal password
app.post("/api/personalunlock", async (req,res)=>{
  const resp = await PassWeaver.personalUnlock(req, req.session, req.body.password)
  res.status(200).json(resp)
})

// Events
app.post("/api/events", async(req,res)=> {
  const resp = await PassWeaver.addEvent(req, req.session, req.body.event, req.body.itemtype, req.body.itemid)
  res.status(200).json(resp)
})

// Get user preferences
app.get("/api/preferences", async(req,res)=>{
  const resp = await PassWeaver.preferencesGet(req, req.session)
  res.status(200).json(resp)
})

// Set user preferences
app.post("/api/preferences", async(req,res)=>{
  const resp = await PassWeaver.preferencesSet(req, req.session)

  // Reapply theme
  const theme = req?.body?.theme
  if ( theme ) {
    req.session.theme = theme
    req.session.save()
  }
  res.status(200).json(resp)
})

// Error handler
app.use((err, req, res, next)=> {
  logErrors.write(`[${(new Date()).toString()}]\n`)
  logErrors.write(`${req.method} ${req.originalUrl}\n`)
  logErrors.write(`${err.stack}\n`)
  logErrors.write(`err.message\n`)
  res.redirect("/logout?error="+encodeURIComponent(err))
})

// Item types list
app.get("/api/itemtypes", async (req,res)=>{
  const resp = await PassWeaver.itemTypesList(req, req.session)
  res.status(200).json(resp)
})

// New item type
app.post("/api/itemtypes", async (req,res)=>{
  const resp = await PassWeaver.itemTypeCreate(req, req.session, req.body.description, req.body.icon)
  res.status(200).json(resp)
})

// Delete item type
app.delete("/api/itemtypes/:id", async(req,res)=>{
  const resp = await PassWeaver.itemTypeRemove(req, req.session, req.params.id)
  res.status(200).json(resp)
})

// Get item type
app.get("/api/itemtypes/:id", async(req,res)=>{
  const resp = await PassWeaver.itemTypeGet(req, req.session, req.params.id)
  res.status(200).json(resp)
})

// Update item type
app.patch("/api/itemtypes/:id", async (req,res)=>{
  const resp = await PassWeaver.itemTypeEdit(req, req.session, req.params.id, req.body.description, req.body.icon)
  res.status(200).json(resp)
})

// Create one time secret
app.post("/api/onetimesecret", async (req,res)=>{
  const resp = await PassWeaver.oneTimeSecretCreate(req, req.session, req.body.data, req.body.hours)
  res.status(200).json(resp)
})

// Get one time secret
app.get("/onetimesecretget/:token", async (req,res)=>{
  const resp = await PassWeaver.oneTimeSecretGet(req, req.session, req.params.token)
  res.status(200).json(resp)
})

console.log(`Listening on port ${cfg.listen_port}`)

// HTTP(S) server startup
if ( cfg.https.enabled ) {
  https.createServer({
    key: FS.readFileSync(cfg.https.private_key),
    cert: FS.readFileSync(cfg.https.certificate)
    },
    app
  ).listen(cfg.listen_port)
} else {
  app.listen(cfg.listen_port)
}